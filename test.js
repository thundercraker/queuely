var assert = require('assert');
var queuely = require('./queuely.js');

Array.prototype.compare = function(testArr) {
    if (this.length != testArr.length) return false;
    for (var i = 0; i < testArr.length; i++) {
        if (this[i].compare) { //To test values in nested arrays
            if (!this[i].compare(testArr[i])) return false;
        }
        else if (this[i] !== testArr[i]) return false;
    }
    return true;
}

describe('Queuely', function() {
    describe('Basic', function() {
        it('should initialize', function() {
            var queuely = new Queuely();
            assert.notEqual(queuely, null);
        });
        it('should have empty listeners obj', function() {
            var queuely = new Queuely();
            assert.equal(Object.keys(queuely._listeners).length, 0);
        });
    });

    describe('Add or Remove tests', function() {
        it('should be able to add master listener', function() {
            var queuely = new Queuely();
            var out = [];
            queuely.on('master', function() { out.push('master') });
            queuely._listeners['master'].listener();
            assert.equal('master', out[0]);
            assert.ok(queuely._listeners['master']);
        });
        it('should be able to remove master listener', function() {
            var queuely = new Queuely();
            var out = [];
            queuely.on('master', function() { out.push('master') });
            queuely._listeners['master'].listener();
            assert.equal('master', out[0]);
            assert.ok(queuely.removeMaster('master'));
            assert.equal(queuely._listeners['master'], null);
        });
        it('should be able to add slave listener', function() {
            var queuely = new Queuely();
            var out = [];
            queuely.on('master', function() { out.push('master') });
            queuely.on('master', function() { out.push('slave') });
            queuely._listeners[queuely._listeners['master'].next].listener();
            queuely._listeners['master'].listener();
            assert.deepEqual(['slave', 'master'], out);
        });
        it('should be able to add slave to slave listener', function() {
            var queuely = new Queuely();
            var out = [];
            queuely.on('master', function() { out.push('master') });
            queuely.on('master', function() { out.push('slave0') });
            queuely.on('master', function() { out.push('slave1') });
            queuely._listeners[queuely._listeners[queuely._listeners['master'].next].next].listener();
            queuely._listeners[queuely._listeners['master'].next].listener();
            queuely._listeners['master'].listener();
            assert.deepEqual(['slave1', 'slave0', 'master'], out);
        });
        it('should be able to remove master listener', function() {
            var queuely = new Queuely();
            queuely.on('master', function() { out.push('master') });
            var slave0 = queuely.on('master', function() { out.push('slave0') });
            var slave1 = queuely.on('master', function() { out.push('slave1') });
            queuely.remove('master');
            assert.equal(null, queuely._listeners['master']);
            assert.equal(null, queuely._listeners[slave0]);
            assert.equal(null, queuely._listeners[slave1]);
        });
        it('should be able to remove slave of slave listener', function() {
            var queuely = new Queuely();
            queuely.on('master', function() { out.push('master') });
            queuely.on('master', function() { out.push('slave0') });
            var slave1 = queuely.on('master', function() { out.push('slave1') });
            queuely.remove(slave1);
            assert.equal(null, queuely._listeners[slave1]);
        });
    });

    describe('Utility Methods', function() {
        it('test for eventNames method', function () {
            var queuely = new Queuely();
            queuely.on('master0', function() { out.push('master0') });
            queuely.on('master0', function() { out.push('slave0') });
            queuely.on('master1', function() { out.push('master1') });
            queuely.on('master1', function() { out.push('slave0') });
            assert.deepEqual({master0: 0, master1: 0}, queuely.eventNames());
        });
        it('test for followerCount method', function () {
            var queuely = new Queuely();
            queuely.on('master0', function() { out.push('master0') });
            queuely.on('master0', function() { out.push('slave0') });
            queuely.on('master0', function() { out.push('slave0') });
            queuely.on('master1', function() { out.push('master1') });
            queuely.on('master1', function() { out.push('slave0') });
            assert.equal(2, queuely.followerCount('master0'));
            assert.equal(1, queuely.followerCount('master1'));
        });
        it('test for followers method', function () {
            var queuely = new Queuely();
            var out = [];
            queuely.on('master0', function() { out.push('master0') });
            queuely.on('master0', function() { out.push('slave0') });
            queuely.on('master0', function() { out.push('slave0') });
            queuely.on('master1', function() { out.push('master1') });
            var m1s0 = queuely.on('master1', function() { out.push('slave0') });
            var master0f = queuely.followers('master0');
            master0f[0]();
            master0f[1]();
            assert.deepEqual(['slave0', 'slave0'], out);
            assert.deepEqual([], queuely.followers(m1s0));
        });
    });

    describe('Emitting', function() {
        it('Emit with only one master', function() {
            var queuely = new Queuely();
            var out = [];
            queuely.on('master', function() { out.push('master') });
            queuely.emit('master');
            assert.deepEqual(['master'], out);
        });
        it('Emit with master(s0, s1)', function() {
            var queuely = new Queuely();
            var out = [];
            queuely.on('master', function() { assert.deepEqual(['slave0', 'slave1'], out); });
            queuely.on('master', function(bundle) { out.push('slave0'); this.Finish(); });
            queuely.on('master', function(bundle) { out.push('slave1'); this.Finish(); });
            queuely.emit('master');
        });
        it('Emit with master(s0, s1) & master0()', function() {
            var queuely = new Queuely();
            var out = [];
            queuely.on('master', function() { assert.deepEqual(['slave0', 'slave1'], out); });
            queuely.on('master', function(bundle) { out.push('slave0'); this.Finish(); });
            queuely.on('master', function(bundle) { out.push('slave1'); this.Finish(); });
            queuely.emit('master');

            assert.throws(function() {
                queuely.on('master0', function() { throw new Error("Expected"); });
                queuely.emit('master0');
            }, /Expected/);
        });

        it('Emit with master(s0, s1, s2, s3, s4) with data', function() {
            var queuely = new Queuely();
            var out = 0;
            queuely.on('master', function() { assert.equal(15, out); });
            queuely.on('master', function(bundle) { out += this.data[0] + 0; this.Finish(); });
            queuely.on('master', function(bundle) { out += this.data[0] + 1; this.Finish(); });
            queuely.on('master', function(bundle) { out += this.data[0] + 2; this.Finish(); });
            queuely.on('master', function(bundle) { out += this.data[0] + 3; this.Finish(); });
            queuely.on('master', function(bundle) { out += this.data[0] + 4; this.Finish(); });
            queuely.emit('master', 1);
        });

        it('Emit with master(s0, s1, s2) with jquery ajax', function() {
            var queuely = new Queuely();
            var out = 0;
            queuely.on('master', function() { assert.equal(6, out); });
            queuely.on('master', function(bundle) {
                setTimeout(function() {
                    out += this.data[0] + 0;
                    this.Finish();
                }, 1000);
            });
            queuely.on('master', function(bundle) {
                setTimeout(function() {
                    out += this.data[0] + 1;
                    this.Finish();
                }, 1000);
            });
            queuely.on('master', function(bundle) {
                setTimeout(function() {
                    out += this.data[0] + 2;
                    this.Finish();
                }, 1000);
            });
            queuely.emit('master', 1);
        });
    });

    describe('Order Manipuation', function() {
        it('insert listener after', function() {
            var queuely = new Queuely();
            var out = 1;
            queuely.on('master', function() { assert.equal(6, out); });
            var s0 = queuely.on('master', function(bundle) { out += this.data[0] + 0; this.Finish(); });
            var s1 = queuely.after('master', function(bundle) { out *= this.data[0] + 4; this.Finish(); });
            queuely.emit('master', 1);
        });
    });

    describe('Termination', function() {
        it('should terminate properly', function() {
            it('Emit with master(s0, s1, s2, s3, s4) with data', function() {
                var queuely = new Queuely();
                var out = 0;
                queuely.on('master', function() { assert.equal(4, out); });
                queuely.on('master', function(bundle) { out += this.data[0] + 0; this.Finish(); });
                queuely.on('master', function(bundle) { out += this.data[0] + 1; this.Finish(); });
                queuely.on('master', function(bundle) { out += this.data[0] + 2; this.Terminate(); });
                queuely.on('master', function(bundle) { out += this.data[0] + 3; this.Finish(); });
                queuely.on('master', function(bundle) { out += this.data[0] + 4; this.Finish(); });
                queuely.emit('master', 1);
            });
        });

        it('should terminate hard properly', function() {
            it('Emit with master(s0, s1, s2, s3, s4) with data', function() {
                var queuely = new Queuely();
                var out = 0;
                queuely.on('master', function() { assert.equal(1, 0); });
                queuely.on('master', function(bundle) { out += this.data[0] + 0; this.Finish(); });
                queuely.on('master', function(bundle) { out += this.data[0] + 1; this.Finish(); });
                queuely.on('master', function(bundle) { out += this.data[0] + 2; this.Terminate(true); });
                queuely.on('master', function(bundle) { out += this.data[0] + 3; this.Finish(); });
                queuely.on('master', function(bundle) { out += this.data[0] + 4; this.Finish(); });
                queuely.emit('master', 1);
            });
        });
    });
});
