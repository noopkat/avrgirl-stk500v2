// harness
var test = require('tape');
// test helpers
var sinon = require('sinon');
var usb = require('./helpers/mock-usb');

// module to test
var libusb = require('../lib/libusb-comms');

var device = usb.findByIds(0, 1);

test('[ LIBUSB-COMMS ] method presence', function (t) {
  var a = new libusb(device);
  function isFn(name) {
    return typeof a[name] === 'function';
  };
  var methods = [
    'open',
    'close',
    'setUpInterface',
    'read',
    'write'
  ];
  for (var i = 0; i < methods.length; i += 1) {
    t.ok(isFn(methods[i]), methods[i]);
    if (i === (methods.length - 1)) {
      t.end();
    }
  }
});
