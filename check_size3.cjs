const fs = require('fs');
const data1 = fs.readFileSync('test_csg_data_1door.txt', 'utf8');
const data2 = fs.readFileSync('test_csg_data_2doors.txt', 'utf8');
console.log(data1.length);
console.log(data2.length);
console.log(data1 === data2);
