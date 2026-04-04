const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  /<span className="text-sm font-medium text-zinc-700 group-hover:text-zinc-900 transition-colors">Generate Dimensions<\/span>/g,
  '<span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">Generate Dimensions</span>'
);

content = content.replace(
  /<h3 className=\{`font-bold text-\[11px\] uppercase tracking-wider \$\{activeWallSection === 'floor' \? 'text-indigo-700' : 'text-zinc-700'\}`\}>Floors<\/h3>/g,
  "<h3 className={`font-bold text-[11px] uppercase tracking-wider ${activeWallSection === 'floor' ? 'text-indigo-700 dark:text-indigo-400' : 'text-zinc-700 dark:text-zinc-300'}`}>Floors</h3>"
);

content = content.replace(
  /<span className="text-\[11px\] font-semibold text-zinc-600 uppercase tracking-wider">Add Floor Framing<\/span>/g,
  '<span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Add Floor Framing</span>'
);

content = content.replace(
  /: 'text-zinc-500 hover:text-zinc-700'/g,
  ": 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'"
);

content = content.replace(
  /<span className="text-\[11px\] font-semibold text-zinc-600 uppercase tracking-wider">Add Subfloor<\/span>/g,
  '<span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Add Subfloor</span>'
);

content = content.replace(
  /<h3 className=\{`font-bold text-\[11px\] uppercase tracking-wider \$\{activeWallSection === 'framing' \? 'text-indigo-700' : 'text-zinc-700'\}`\}>Wall Framing Options<\/h3>/g,
  "<h3 className={`font-bold text-[11px] uppercase tracking-wider ${activeWallSection === 'framing' ? 'text-indigo-700 dark:text-indigo-400' : 'text-zinc-700 dark:text-zinc-300'}`}>Wall Framing Options</h3>"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done');
