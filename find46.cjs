const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/App.tsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('ring-zinc-300') && !line.includes('dark:')) {
    console.log(`${i + 1}: ${line.trim()}`);
  }
}
