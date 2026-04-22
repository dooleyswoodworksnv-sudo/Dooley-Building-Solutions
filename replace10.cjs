const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  /<span className="absolute right-3 top-1\/2 -translate-y-1\/2 text-xs text-indigo-400 font-medium">ft<\/span>/g,
  '<span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-indigo-400 dark:text-indigo-500 font-medium">ft</span>'
);

content = content.replace(
  /<span className="absolute right-3 top-1\/2 -translate-y-1\/2 text-xs text-indigo-400 font-medium">in<\/span>/g,
  '<span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-indigo-400 dark:text-indigo-500 font-medium">in</span>'
);

content = content.replace(
  /<label className="text-\[10px\] font-semibold text-indigo-400 uppercase tracking-wider">Upper Floor Wall Height<\/label>/g,
  '<label className="text-[10px] font-semibold text-indigo-400 dark:text-indigo-500 uppercase tracking-wider">Upper Floor Wall Height</label>'
);

content = content.replace(
  /<span className="absolute right-3 top-1\/2 -translate-y-1\/2 text-\[10px\] text-indigo-400 font-medium">ft<\/span>/g,
  '<span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-indigo-400 dark:text-indigo-500 font-medium">ft</span>'
);

content = content.replace(
  /<span className="absolute right-3 top-1\/2 -translate-y-1\/2 text-\[10px\] text-indigo-400 font-medium">in<\/span>/g,
  '<span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-indigo-400 dark:text-indigo-500 font-medium">in</span>'
);

content = content.replace(
  /<label className="text-\[10px\] font-semibold text-indigo-400 uppercase tracking-wider">Upper Floor Joist Size<\/label>/g,
  '<label className="text-[10px] font-semibold text-indigo-400 dark:text-indigo-500 uppercase tracking-wider">Upper Floor Joist Size</label>'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done');
