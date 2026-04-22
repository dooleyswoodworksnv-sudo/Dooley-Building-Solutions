const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  /\{activeWallSection === 'floor' \? <ChevronDown size=\{14\} className="text-indigo-400 ml-2" \/> : <ChevronRight size=\{14\} className="text-zinc-400 ml-2" \/>\}/g,
  "{activeWallSection === 'floor' ? <ChevronDown size={14} className=\"text-indigo-400 dark:text-indigo-500 ml-2\" /> : <ChevronRight size={14} className=\"text-zinc-400 dark:text-zinc-500 ml-2\" />}"
);

content = content.replace(
  /\{activeWallSection === 'framing' \? <ChevronDown size=\{14\} className="text-indigo-400" \/> : <ChevronRight size=\{14\} className="text-zinc-400" \/>\}/g,
  "{activeWallSection === 'framing' ? <ChevronDown size={14} className=\"text-indigo-400 dark:text-indigo-500\" /> : <ChevronRight size={14} className=\"text-zinc-400 dark:text-zinc-500\" />}"
);

content = content.replace(
  /<p className="text-\[10px\] text-zinc-400 leading-relaxed mb-4">/g,
  '<p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-relaxed mb-4">'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done');
