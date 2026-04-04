const fs = require('fs');
const path = require('path');

const testFilePath = path.join(__dirname, 'test_file.txt');
fs.writeFileSync(testFilePath, 'test content');

(async () => {
    try {
        const fetch = (await import('node-fetch')).default;
        const FormData = (await import('form-data')).default;
        
        const form = new FormData();
        form.append('title', 'test_from_script');
        form.append('type', 'model');
        form.append('targetFolder', 'brick');
        form.append('assetFile', fs.createReadStream(testFilePath), 'test_file.txt');
        
        const res = await fetch('http://localhost:3001/api/upload', {
            method: 'POST',
            body: form
        });
        
        const text = await res.text();
        console.log("Status:", res.status);
        console.log("Response:", text);
    } catch(e) {
        console.error("Fetch Error:", e);
    }
})();
