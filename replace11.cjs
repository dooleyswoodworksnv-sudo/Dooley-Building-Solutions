const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  /<div className="bg-indigo-600 p-2 rounded-lg text-white shadow-sm">/g,
  '<div className="bg-indigo-600 dark:bg-indigo-500 p-2 rounded-lg text-white shadow-sm">'
);

content = content.replace(
  /\{generateDimensions && <div className="w-full h-full bg-indigo-600 flex items-center justify-center"><Check size=\{12\} className="text-white" \/><\/div>\}/g,
  '{generateDimensions && <div className="w-full h-full bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center"><Check size={12} className="text-white" /></div>}'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done');
