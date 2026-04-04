const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  /<label className="text-\[11px\] font-semibold text-indigo-500 uppercase tracking-wider">Wall 5: Middle<\/label>/g,
  '<label className="text-[11px] font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">Wall 5: Middle</label>'
);

content = content.replace(
  /<label className="text-\[11px\] font-semibold text-indigo-500 uppercase tracking-wider">Wall 6: Left Inner<\/label>/g,
  '<label className="text-[11px] font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">Wall 6: Left Inner</label>'
);

content = content.replace(
  /<Layers size=\{14\} className="text-indigo-500" \/>/g,
  '<Layers size={14} className="text-indigo-500 dark:text-indigo-400" />'
);

content = content.replace(
  /<Loader2 className="w-8 h-8 text-indigo-500 animate-spin" \/>/g,
  '<Loader2 className="w-8 h-8 text-indigo-500 dark:text-indigo-400 animate-spin" />'
);

content = content.replace(
  /<Loader2 className="w-12 h-12 text-indigo-500 animate-spin" \/>/g,
  '<Loader2 className="w-12 h-12 text-indigo-500 dark:text-indigo-400 animate-spin" />'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done');
