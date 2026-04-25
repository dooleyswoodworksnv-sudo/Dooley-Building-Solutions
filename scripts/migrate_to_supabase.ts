
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper to get __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase configuration in .env");
    console.error("Required: VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const ASSETS_DIR = path.join(process.cwd(), 'assets');
const BUCKET_NAME = 'assets';

async function migrate() {
    console.log(`🚀 Starting migration from ${ASSETS_DIR} to Supabase bucket "${BUCKET_NAME}"...`);

    if (!fs.existsSync(ASSETS_DIR)) {
        console.error(`❌ Local assets directory not found at ${ASSETS_DIR}`);
        return;
    }

    const files = getAllFiles(ASSETS_DIR);
    console.log(`Found ${files.length} files to upload.`);

    for (const file of files) {
        const relativePath = path.relative(ASSETS_DIR, file).replace(/\\/g, '/');
        
        // Skip hidden config files if you want, but likely better to include them
        if (relativePath.startsWith('.')) continue;

        console.log(`Uploading: ${relativePath}...`);
        
        const fileBuffer = fs.readFileSync(file);
        const contentType = getContentType(file);

        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(relativePath, fileBuffer, {
                upsert: true,
                contentType
            });

        if (error) {
            console.error(`❌ Failed to upload ${relativePath}:`, error.message);
        } else {
            console.log(`✅ Uploaded ${relativePath}`);
        }
    }

    console.log("🏁 Migration complete!");
}

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []) {
    const files = fs.readdirSync(dirPath);

    files.forEach((file) => {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
        } else {
            arrayOfFiles.push(fullPath);
        }
    });

    return arrayOfFiles;
}

function getContentType(filePath: string) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.png': return 'image/png';
        case '.jpg':
        case '.jpeg': return 'image/jpeg';
        case '.webp': return 'image/webp';
        case '.skp': return 'application/octet-stream'; // SketchUp
        case '.obj': return 'text/plain';
        case '.json': return 'application/json';
        case '.txt': return 'text/plain';
        default: return 'application/octet-stream';
    }
}

migrate();
