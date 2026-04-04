const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  /className="text-indigo-500 hover:text-indigo-600 p-0\.5 rounded-full transition-colors flex items-center gap-1 text-\[10px\] font-semibold uppercase tracking-wider"/g,
  'className="text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 p-0.5 rounded-full transition-colors flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider"'
);

content = content.replace(
  /className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"/g,
  'className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 dark:text-indigo-500 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-zinc-800"'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done');
