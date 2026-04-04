const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  /<div className="pt-4 border-t border-zinc-200">/g,
  '<div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">'
);

content = content.replace(
  /<div className="border-b border-zinc-100 last:border-b-0">/g,
  '<div className="border-b border-zinc-100 dark:border-zinc-800 last:border-b-0">'
);

content = content.replace(
  /<div className="flex gap-1 bg-zinc-100 p-1 rounded-lg border border-zinc-200">/g,
  '<div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-lg border border-zinc-200 dark:border-zinc-700">'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done');
