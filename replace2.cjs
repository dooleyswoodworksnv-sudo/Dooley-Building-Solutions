const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  /className=\{`px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-zinc-50 transition-colors \$\{activeWallSection === 'floor' \? 'bg-indigo-50\/30' : 'bg-white'\}`\}/g,
  "className={`px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${activeWallSection === 'floor' ? 'bg-indigo-50/30 dark:bg-indigo-900/20' : 'bg-white dark:bg-[#1E1E1E]'}`}"
);

content = content.replace(
  /<div className="p-5 space-y-6 bg-white border-t border-zinc-100">/g,
  '<div className="p-5 space-y-6 bg-white dark:bg-[#1E1E1E] border-t border-zinc-100 dark:border-zinc-800">'
);

content = content.replace(
  /\? 'bg-white text-indigo-600 shadow-sm'/g,
  "? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'"
);

content = content.replace(
  /className=\{`px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-zinc-50 transition-colors \$\{activeWallSection === 'framing' \? 'bg-indigo-50\/30' : 'bg-white'\}`\}/g,
  "className={`px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${activeWallSection === 'framing' ? 'bg-indigo-50/30 dark:bg-indigo-900/20' : 'bg-white dark:bg-[#1E1E1E]'}`}"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done');
