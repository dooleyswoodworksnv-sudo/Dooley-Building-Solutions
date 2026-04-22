const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  /<LayoutGrid size=\{14\} className=\{activeWallSection === 'floor' \? 'text-indigo-500' : 'text-zinc-500'\} \/>/g,
  "<LayoutGrid size={14} className={activeWallSection === 'floor' ? 'text-indigo-500 dark:text-indigo-400' : 'text-zinc-500 dark:text-zinc-400'} />"
);

content = content.replace(
  /<Hammer size=\{14\} className=\{activeWallSection === 'framing' \? 'text-indigo-500' : 'text-zinc-500'\} \/>/g,
  "<Hammer size={14} className={activeWallSection === 'framing' ? 'text-indigo-500 dark:text-indigo-400' : 'text-zinc-500 dark:text-zinc-400'} />"
);

content = content.replace(
  /<div className="flex items-center gap-2 text-\[9px\] text-zinc-500 italic">/g,
  '<div className="flex items-center gap-2 text-[9px] text-zinc-500 dark:text-zinc-400 italic">'
);

content = content.replace(
  /<label className="text-\[10px\] font-bold text-zinc-500 uppercase tracking-wider">Generate:<\/label>/g,
  '<label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Generate:</label>'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done');
