// check for all props
var test = require('tape');
var C = require('../lib/c');

test('[ C ] length of props', function (t) {
  var cKeysLen = 47;
  t.equal(Object.keys(C).length, cKeysLen, 'length of props list is correct');
  t.end();
});
