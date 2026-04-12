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
import Stripe from 'stripe';
import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2026-03-25.dahlia' // Use the latest acceptable version
});

// Validation for Supabase configuration on startup
if (!process.env.VITE_SUPABASE_URL || (!process.env.VITE_SUPABASE_SERVICE_ROLE_KEY && !process.env.VITE_SUPABASE_ANON_KEY)) {
    console.error("❌ CRITICAL ERROR: Supabase configuration is missing in .env file.");
    console.error("Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY are set.");
} else {
    console.log("✅ Supabase Configuration detected.");
    console.log(`🔗 URL: ${process.env.VITE_SUPABASE_URL}`);
}

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL',
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

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

        const ext = path.extname(file.originalname);
        const finalName = title ? `${title.replace(/\s+/g, '_')}${ext}` : file.originalname;
        
        // Construct cloud storage path
        const cloudPath = targetFolder ? `${targetFolder}/${finalName}` : `models/${finalName}`;
        
        // Read the local multer temp file
        const fileBuffer = fs.readFileSync(file.path);

        // Upload directly to Supabase Bucket
        const { data, error } = await supabase.storage.from('assets').upload(cloudPath, fileBuffer, {
            upsert: true,
            contentType: file.mimetype
        });

        if (error) {
            console.error("❌ Supabase Upload Error:", error.message);
            throw error;
        }

        console.log(`✅ File uploaded successfully to: ${cloudPath}`);

        // Clean up temp file
        fs.unlinkSync(file.path);

        // Get public URL
        const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(cloudPath);

        res.json({ success: true, path: publicUrl });
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

app.post('/api/folders', async (req, res) => {
    try {
        const { folderName, rootType } = req.body;
        if (!folderName) return res.status(400).json({ error: 'Folder name is required' });

        // Supabase folders are virtual; create a dummy file to instantiate the folder
        const dummyPath = `${folderName}/.emptyFolderPlaceholder`;
        const { error } = await supabase.storage.from('assets').upload(dummyPath, new Uint8Array(), { upsert: true });

        if (error) {
            throw error;
        }

        res.json({ success: true, path: folderName });
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

app.get('/api/assets', async (req, res) => {
    try {
        let allAssets: any[] = [];
        
        async function traverseSupabase(currentPath: string) {
            const { data, error } = await supabase.storage.from('assets').list(currentPath);
            if (error) {
                console.error("Supabase List Error:", error);
                return;
            }

            if (!data || data.length === 0) {
                allAssets.push({
                    isEmptyFolder: true,
                    directory: currentPath,
                    name: '_empty'
                });
                return;
            }

            for (const item of data) {
                if (item.name === '.emptyFolderPlaceholder') continue;
                
                // If it has an ID, it's a file
                if (item.id) {
                    const fullPath = currentPath ? `${currentPath}/${item.name}` : item.name;
                    const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(fullPath);
                    
                    allAssets.push({
                        name: item.name,
                        absolutePath: publicUrl,
                        directory: currentPath
                    });
                } else {
                    // It's a folder prefix (no id)
                    const nextPath = currentPath ? `${currentPath}/${item.name}` : item.name;
                    await traverseSupabase(nextPath);
                }
            }
        }

        // Start recursion at root
        await traverseSupabase('');

        res.json({ assets: allAssets });
    } catch(e: any) {
        console.error("❌ Fetch Cloud Assets Error:", e.message || e);
        res.status(500).json({ error: e.message });
    }
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

// ─── Stripe Monetization ──────────────────────────────────────────
app.post('/api/create-checkout-session', async (req, res) => {
    try {
        if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('sk_test_...')) {
             return res.json({ id: 'dummy_session_id', url: 'http://localhost:3000?success=true' });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'Dooley\'s Builder Pro Subscription',
                        },
                        unit_amount: 1999, // $19.99/month
                        recurring: { interval: 'month' }
                    },
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${process.env.APP_URL || 'http://localhost:3000'}?success=true`,
            cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}?canceled=true`,
        });

        res.json({ id: session.id, url: session.url });
    } catch(e: any) {
        console.error("Stripe Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// ─── Print in Backend ──────────────────────────────────────────────
app.post('/api/generate-print', async (req, res) => {
    try {
        const { state } = req.body;
        // In a real app, we verify the user has a PRO subscription in DB here.

        console.log("Generating Backend PDF for Project...");
        
        // Launch headless browser to generate the PDF
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        
        // As a prototype, we build a simple HTML string representing the Blueprint Data
        // Ideally, we'd navigate to a special hidden route on the frontend `http://localhost:3000/print-view`
        // and inject the state there via localStorage or URL params.
        const htmlContent = `
            <html>
                <head>
                    <style>
                        body { font-family: 'Helvetica', sans-serif; padding: 40px; }
                        h1 { color: #2563eb; }
                        .summary { background: #f3f4f6; padding: 20px; border-radius: 8px; }
                    </style>
                </head>
                <body>
                    <h1>Dooley's Building Solutions - Blueprint Report</h1>
                    <div class="summary">
                        <h2>Dimensions</h2>
                        <p>Total Width: \${state.widthFt || 0}' \${state.widthInches || 0}"</p>
                        <p>Total Length: \${state.lengthFt || 0}' \${state.lengthInches || 0}"</p>
                        <p>Wall Height: \${state.wallHeightFt || 0}' \${state.wallHeightInches || 0}"</p>
                    </div>
                </body>
            </html>
        `;

        await page.setContent(htmlContent);
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        
        await browser.close();

        // Return PDF file buffer directly to client
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="blueprint.pdf"',
            'Content-Length': pdfBuffer.length
        });
        
        res.send(Buffer.from(pdfBuffer));
        
    } catch (e: any) {
        console.error("Backend Print Error:", e);
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, () => {
    console.log(`Asset Management Server running on port ${PORT}`);
});
