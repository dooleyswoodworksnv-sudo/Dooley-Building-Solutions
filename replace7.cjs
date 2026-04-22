const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  /<div className="mt-4 p-4 bg-indigo-50\/50 rounded-xl border border-indigo-100 space-y-4">/g,
  '<div className="mt-4 p-4 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800 space-y-4">'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done');
