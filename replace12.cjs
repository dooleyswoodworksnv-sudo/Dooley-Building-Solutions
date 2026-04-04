const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  /<div className="relative flex items-center justify-center w-5 h-5 border-2 border-zinc-300 rounded overflow-hidden group-hover:border-indigo-500 transition-colors">/g,
  '<div className="relative flex items-center justify-center w-5 h-5 border-2 border-zinc-300 dark:border-zinc-700 rounded overflow-hidden group-hover:border-indigo-500 dark:group-hover:border-indigo-400 transition-colors">'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done');
