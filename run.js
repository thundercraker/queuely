var queuely = require('./queuely.js');

var queuely = new Queuely();
var out = 0;
queuely.on('master', function() { console.log(out); });
queuely.on('master', function(bundle) { out += this.data[0] + 0; this.Finish(); });
queuely.on('master', function(bundle) { out += this.data[0] + 1; this.Finish(); });
queuely.on('master', function(bundle) { out += this.data[0] + 2; this.Finish(); });
queuely.on('master', function(bundle) { out += this.data[0] + 3; this.Finish(); });
queuely.on('master', function(bundle) { out += this.data[0] + 4; this.Finish(); });
queuely.emit('master', 1);

queuely = new Queuely();
out = 1;
queuely.on('master', function() { console.log(out); });
var s0 = queuely.on('master', function(bundle) { out += this.data[0] + 0; this.Finish(); });
var s1 = queuely.after('master', function(bundle) { out *= this.data[0] + 4; this.Finish(); });
queuely.emit('master', 1);

queuely = new Queuely();
out = [];
queuely.on('master', function() { console.log(out); });
queuely.on('master', function(bundle) { out.push('slave0'); this.Finish(); });
queuely.on('master', function(bundle) { out.push('slave1'); this.Finish(); });
queuely.on('master1', function() { console.log(out); });
queuely.on('master1', function(bundle) { out.push('m1slave0'); this.Finish(); });
queuely.on('master1', function(bundle) { out.push('m1slave1'); this.Finish(); });
queuely.emit('master1');
queuely.emit('master');
