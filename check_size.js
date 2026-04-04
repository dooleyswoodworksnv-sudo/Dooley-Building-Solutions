const fs = require('fs');
const data = fs.readFileSync('test_csg_data.txt', 'utf8');
console.log(data.length);
