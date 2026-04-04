const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/Preview2D.tsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if ((line.includes('bg-white') || line.includes('bg-zinc-50')) && !line.includes('dark:')) {
    console.log(`${i + 1}: ${line.trim()}`);
  }
}
