
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase configuration");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    console.log("Testing connection to Supabase...");
    console.log("URL:", supabaseUrl);
    
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
        console.error("Error listing buckets:", bucketError);
        return;
    }
    
    console.log("Buckets found:", buckets.map(b => b.name).join(', '));
    
    const assetsBucket = buckets.find(b => b.name === 'assets');
    if (!assetsBucket) {
        console.error("Bucket 'assets' NOT FOUND!");
        return;
    }
    
    console.log("Listing files in 'assets' bucket...");
    const { data, error } = await supabase.storage.from('assets').list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
    });
    
    if (error) {
        console.error("Error listing files:", error);
    } else {
        console.log("Files/Folders in root:", data.map(i => `${i.name} (${i.id ? 'File' : 'Folder'})`));
    }
}

testConnection();
