const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/Preview2D.tsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if ((line.includes('text-zinc-600') || line.includes('text-zinc-700') || line.includes('text-zinc-800') || line.includes('text-zinc-900') || line.includes('border-zinc-100') || line.includes('border-zinc-200') || line.includes('bg-zinc-100')) && !line.includes('dark:')) {
    console.log(`${i + 1}: ${line.trim()}`);
  }
}
