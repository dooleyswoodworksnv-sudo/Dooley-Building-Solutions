import express from 'express';
import cors from 'cors';
// @ts-ignore
import { AssetScraper } from './src/services/scraper';
// @ts-ignore
import { AssetCategorizer } from './src/services/categorizer';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import multer from 'multer';

dotenv.config();

const app = express();
const PORT = 3001;
const upload = multer({ dest: path.join(process.cwd(), 'downloads') });

// Use CORS to allow Vite frontend to access backend
// Use CORS to allow Vite frontend to access backend
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept"]
}));
app.use(express.json());

// Serve the assets directory directly
app.use('/assets', express.static(path.join(process.cwd(), 'assets')));

app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q as string;
        if (!query) {
            return res.status(400).json({ error: 'Query parameter q is required' });
        }
        
        console.log(`Searching for: ${query}`);
        const scraper = new AssetScraper();
        const results = await scraper.search(query);
        res.json({ success: true, results });
    } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/download', async (req, res) => {
    try {
        const { url, title, type } = req.body;
        if (!url || !title) {
            return res.status(400).json({ error: 'URL and title are required' });
        }

        const scraper = new AssetScraper();
        const downloadedFilePath = await scraper.download(url, title);
        
        const categorizer = new AssetCategorizer();
        const finalAssetPath = await categorizer.categorizeAndMove(downloadedFilePath, title, type || 'model');

        res.json({ success: true, path: finalAssetPath });
    } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/upload', upload.single('assetFile'), async (req, res) => {
    try {
        const file = req.file;
        const { title, type, targetFolder } = req.body;
        
        if (!file || !title) {
            return res.status(400).json({ error: 'File and title are required' });
        }

        const originalPath = file.path;
        const ext = path.extname(file.originalname);
        
        // Preserve actual file name or user-assigned title, instead of multer's abstract hash tracking
        const finalName = title ? `${title.replace(/\s+/g, '_')}${ext}` : file.originalname;
        const targetPath = path.join(path.dirname(originalPath), finalName);
        
        fs.renameSync(originalPath, targetPath);

        let finalAssetPath;
        if (targetFolder) {
            const destFolder = path.join(process.cwd(), 'assets', targetFolder);
            if (!fs.existsSync(destFolder)) {
                fs.mkdirSync(destFolder, { recursive: true });
            }
            finalAssetPath = path.join(destFolder, finalName);
            fs.renameSync(targetPath, finalAssetPath);
        } else {
            const categorizer = new AssetCategorizer();
            finalAssetPath = await categorizer.categorizeAndMove(targetPath, title, type || 'model');
        }

        res.json({ success: true, path: finalAssetPath });
    } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/generate-emblem', async (req, res) => {
    try {
        const { assetPath, type } = req.body;
        if (!assetPath) return res.status(400).json({ error: 'assetPath is required' });
        
        if (!fs.existsSync(assetPath)) return res.status(404).json({ error: 'File not found on server' });
        
        const { BlenderService } = await import('./src/services/blender');
        const blenderService = new BlenderService();
        const outputPngPath = assetPath.substring(0, assetPath.lastIndexOf('.')) + '_emblem.png';
        
        if (type === 'material') {
             await blenderService.generateMaterialEmblem(assetPath, outputPngPath);
        } else {
             await blenderService.generateModelEmblem(assetPath, outputPngPath);
        }
        res.json({ success: true, emblem: outputPngPath });
    } catch(e: any) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/serve-file', (req, res) => {
    const requestedPath = req.query.path as string;
    if (!requestedPath) return res.status(400).send('Path is required');

    const localDir = path.join(process.cwd(), 'assets');
    const externalDirs = process.env.EXTERNAL_ASSET_LIBRARIES 
        ? process.env.EXTERNAL_ASSET_LIBRARIES.split(',').map(d => d.trim()).filter(Boolean)
        : [];
    const allowedRoots = [localDir, ...externalDirs];

    const normalizedReqPath = path.resolve(requestedPath).toLowerCase();
    const isAllowed = allowedRoots.some(root => normalizedReqPath.startsWith(path.resolve(root).toLowerCase()));
    
    if (!isAllowed) {
        return res.status(403).send('Forbidden access: path outside allowed libraries');
    }

    if (!fs.existsSync(requestedPath)) {
        return res.status(404).send('File not found');
    }

    res.sendFile(requestedPath);
});

app.post('/api/folders', (req, res) => {
    try {
        const { folderName, rootType } = req.body;
        if (!folderName) return res.status(400).json({ error: 'Folder name is required' });

        // Default to local assets if rootType is not specified (since external is dangerous to just dump folders in randomly unless specified)
        const targetRoot = path.join(process.cwd(), 'assets');
        const newDirPath = path.join(targetRoot, folderName);
        
        if (fs.existsSync(newDirPath)) {
             return res.status(400).json({ error: 'Folder already exists' });
        }
        
        fs.mkdirSync(newDirPath, { recursive: true });
        res.json({ success: true, path: newDirPath });
    } catch(e: any) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/folders/rename', (req, res) => {
    try {
        const { oldDirectoryName, newDirectoryName } = req.body;
        if (!oldDirectoryName || !newDirectoryName) return res.status(400).json({ error: 'Both old and new names are required' });

        // Since the UI only passes the directory name (`dir`), we have to trace which allowed root it came from.
        const localDir = path.join(process.cwd(), 'assets');
        const externalDirs = process.env.EXTERNAL_ASSET_LIBRARIES 
            ? process.env.EXTERNAL_ASSET_LIBRARIES.split(',').map(d => d.trim()).filter(Boolean)
            : [];
        const allowedRoots = [localDir, ...externalDirs];

        let foundOldPath = null;
        for (const root of allowedRoots) {
             const candidate = path.join(root, oldDirectoryName);
             if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
                 foundOldPath = candidate;
                 break;
             }
        }

        if (!foundOldPath) {
             return res.status(404).json({ error: 'Source directory not found in configured library roots' });
        }

        const newPath = path.join(path.dirname(foundOldPath), newDirectoryName);
        if (fs.existsSync(newPath)) {
             return res.status(400).json({ error: 'Destination directory already exists' });
        }

        fs.renameSync(foundOldPath, newPath);
        res.json({ success: true, newPath });
    } catch(e: any) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/folders/move', (req, res) => {
    try {
        const { sourceDirectoryRelative, targetDirectoryRelative } = req.body;
        if (!sourceDirectoryRelative) return res.status(400).json({ error: 'Source directory is required' });

        // Default constraints: We ONLY allow moving physical folders inside the primary 'assets' directory to confidently prevent shattering external drive syncs.
        const localRoot = path.join(process.cwd(), 'assets');
        
        const sourcePath = path.join(localRoot, sourceDirectoryRelative);
        // If target Directory is empty or root, move it directly to 'assets/'
        const targetPath = targetDirectoryRelative ? path.join(localRoot, targetDirectoryRelative) : localRoot;

        if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isDirectory()) {
             return res.status(404).json({ error: 'Source folder not found in local assets' });
        }
        
        if (!fs.existsSync(targetPath)) {
            fs.mkdirSync(targetPath, { recursive: true });
        }

        const folderToMoveName = path.basename(sourcePath);
        const finalDestinationPath = path.join(targetPath, folderToMoveName);

        if (fs.existsSync(finalDestinationPath)) {
             return res.status(400).json({ error: 'A folder with that name already exists at the destination' });
        }

        fs.renameSync(sourcePath, finalDestinationPath);
        res.json({ success: true, newPath: finalDestinationPath });
    } catch(e: any) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/folders', (req, res) => {
    try {
        const { directoryName } = req.body;
        if (!directoryName) return res.status(400).json({ error: 'Folder name is required' });

        const hiddenFilePath = path.join(process.cwd(), 'hidden_folders.json');
        let hidden: string[] = [];
        if (fs.existsSync(hiddenFilePath)) {
            try { hidden = JSON.parse(fs.readFileSync(hiddenFilePath, 'utf-8')); } catch(e){}
        }
        if (!hidden.includes(directoryName)) {
            hidden.push(directoryName);
            fs.writeFileSync(hiddenFilePath, JSON.stringify(hidden, null, 2));
        }

        res.json({ success: true, hidden: true });
    } catch(e: any) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/assets', (req, res) => {
    let allAssets: any[] = [];
    
    // Read hidden folders config
    const hiddenFilePath = path.join(process.cwd(), 'hidden_folders.json');
    let hiddenFolders: string[] = [];
    if (fs.existsSync(hiddenFilePath)) {
        try { hiddenFolders = JSON.parse(fs.readFileSync(hiddenFilePath, 'utf-8')); } catch(e){}
    }

    const getAllFiles = (dirPath: string, rootDir: string) => {
        if (!fs.existsSync(dirPath)) return;
        
        const dirName = path.basename(dirPath);
        // If this exact folder name is marked as hidden, entirely skip scanning it.
        if (hiddenFolders.includes(dirName)) return;

        // Calculate the full relative tree path from the root
        let relativePath = path.relative(rootDir, dirPath).replace(/\\/g, '/');
        // If the path is empty (meaning they placed files directly in the root), default it to an empty string.
        
        const files = fs.readdirSync(dirPath);
        
        if (files.length === 0) {
            // Push a placeholder asset so the frontend knows this folder exists in the tree
            allAssets.push({
                isEmptyFolder: true,
                directory: relativePath || '', // empty string indicates root level
                name: '_empty'
            });
            return;
        }

        files.forEach(file => {
            const absolutePath = path.join(dirPath, file);
            if (fs.statSync(absolutePath).isDirectory()) {
                getAllFiles(absolutePath, rootDir);
            } else {
                allAssets.push({
                    name: file,
                    absolutePath: absolutePath,
                    // Supply the full relative path instead of just the immediate parent!
                    directory: relativePath || ''
                });
            }
        });
    };

    // 1. Scan internal project assets
    const localDir = path.join(process.cwd(), 'assets');
    getAllFiles(localDir, localDir);

    // 2. Scan external Connecter user-defined folders
    if (process.env.EXTERNAL_ASSET_LIBRARIES) {
        const externalDirs = process.env.EXTERNAL_ASSET_LIBRARIES.split(',').map(d => d.trim()).filter(Boolean);
        externalDirs.forEach(dir => {
            console.log(`Scanning external library: ${dir}`);
            getAllFiles(dir, dir);
        });
    }

    res.json({ assets: allAssets });
});

// ─── Material Config (texture scale / opacity persistence) ────────────────
const MATERIAL_CONFIGS_PATH = path.join(process.cwd(), 'assets', 'material_configs.json');

const readMaterialConfigs = (): Record<string, any> => {
    if (!fs.existsSync(MATERIAL_CONFIGS_PATH)) return {};
    try { return JSON.parse(fs.readFileSync(MATERIAL_CONFIGS_PATH, 'utf-8')); } catch (e) { return {}; }
};

app.get('/api/material-configs', (req, res) => {
    res.json(readMaterialConfigs());
});

app.post('/api/save-material-config', (req, res) => {
    try {
        const { textureUrl, config } = req.body;
        if (!textureUrl || !config) return res.status(400).json({ error: 'textureUrl and config are required' });
        const configs = readMaterialConfigs();
        configs[textureUrl] = config;
        const assetsDir = path.join(process.cwd(), 'assets');
        if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
        fs.writeFileSync(MATERIAL_CONFIGS_PATH, JSON.stringify(configs, null, 2));
        res.json({ success: true });
    } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, () => {
    console.log(`Asset Management Server running on port ${PORT}`);
});
