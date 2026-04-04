const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/className="w-full pl-3 pr-8 py-4 bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500\/20 focus:border-indigo-500 transition-all text-xl font-bold text-zinc-900"/g, 'className="w-full pl-3 pr-8 py-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xl font-bold text-zinc-900 dark:text-zinc-100"');

content = content.replace(/className="w-full px-3 py-4 bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500\/20 focus:border-indigo-500 transition-all text-xl font-bold text-zinc-900"/g, 'className="w-full px-3 py-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xl font-bold text-zinc-900 dark:text-zinc-100"');

content = content.replace(/className="text-\[11px\] font-semibold text-zinc-500 uppercase tracking-wider"/g, 'className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider"');

content = content.replace(/className="absolute right-3 top-1\/2 -translate-y-1\/2 text-xs text-zinc-400 font-medium">ft<\/span>/g, 'className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 dark:text-zinc-500 font-medium">ft</span>');

content = content.replace(/className="absolute right-3 top-1\/2 -translate-y-1\/2 text-xs text-zinc-400 font-medium">in<\/span>/g, 'className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 dark:text-zinc-500 font-medium">in</span>');

content = content.replace(/className="w-full pl-3 pr-8 py-3 bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500\/20 focus:border-indigo-500 transition-all text-lg font-bold text-zinc-900"/g, 'className="w-full pl-3 pr-8 py-3 bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg font-bold text-zinc-900 dark:text-zinc-100"');

content = content.replace(/className="w-full px-3 py-3 bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500\/20 focus:border-indigo-500 transition-all text-lg font-bold text-zinc-900"/g, 'className="w-full px-3 py-3 bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg font-bold text-zinc-900 dark:text-zinc-100"');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done');
