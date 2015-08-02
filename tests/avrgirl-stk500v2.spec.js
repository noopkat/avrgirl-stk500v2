// harness
var test = require('tape');
// test helpers
var sinon = require('sinon');
var proxyquire = require('proxyquire');
var chip = require('./helpers/mock-chip');
var libusbmock = require('./helpers/mock-libusb-comms');
var usbmock = require('./helpers/mock-usb');

// module to test
var avrgirl = proxyquire('../avrgirl-stk500v2', { './lib/libusb-comms': libusbmock });

// test options to pass in to most tests
var FLoptions = {
  chip: chip,
  comm: usbmock,
  debug: false,
  frameless: true
}

// run c tests
require('./c.spec');

test('[ AVRGIRL-STK500V2 ] initialise', function (t) {
  var a = new avrgirl(FLoptions);
  t.equal(typeof a, 'object', 'new is object');
  t.end();
});

test('[ AVRGIRL-STK500V2 ] device ready', function (t) {
  var a = new avrgirl(FLoptions);
  a.on('ready', function() {
    t.ok(typeof a.device === 'object', 'device created');
    // move this to libusb-comms.spec
    // t.ok(a.device.interfaces.length, 'interfaces set up');
    t.pass('emitted "ready"');
    t.end();
  });
  t.timeoutAfter(500);
});

test('[ AVRGIRL-STK500V2 ] method presence', function (t) {
  var a = new avrgirl(FLoptions);
  function isFn(name) {
    return typeof a[name] === 'function';
  };
  var methods = [
    'open',
    'close',
    'write',
    'read',
    'sendCmd',
    'getSignature',
    'verifySignature',
    'verifyProgrammer',
    'loadAddress',
    'loadPage',
    'writeMem',
    'enterProgrammingMode',
    'exitProgrammingMode',
    'eraseChip',
    'writeFlash',
    'writeEeprom',
    'readChipSignature',
    'readFuses',
    'cmdSpiMulti',
    'setParameter',
    'getParameter',
  ];
  for (var i = 0; i < methods.length; i += 1) {
    t.ok(isFn(methods[i]), methods[i]);
    if (i === (methods.length - 1)) {
      t.end();
    }
  }
});

test('[ AVRGIRL-STK500V2 ] ::frame', function (t) {
  var a = new avrgirl(FLoptions);
  var buffer = new Buffer([0xff, 0xff, 0xff, 0xff]);
  var framedExample = new Buffer([0x1b, 0x00, 0x00, 0x04, 0x0e, 0xff, 0xff, 0xff, 0xff, 0x11]);
  var framed = a.frame(buffer);

  t.ok(Buffer.isBuffer(buffer), 'returned result is a buffer');
  t.equal(framed.length, 10, 'returned result length is correct');
  t.ok(framedExample.equals(framed), 'returned result equals expected value');
  t.end();
});

test('[ AVRGIRL-STK500V2 ] ::write', function (t) {
  var a = new avrgirl(FLoptions);
  var buffer = new Buffer([0xff, 0xff, 0xff, 0xff]);
  var array = [0xff, 0xff, 0xff, 0xff];

  t.plan(3);

  a.write(buffer, function(error) {
    t.error(error, 'no error on write buffer callback');
  });

  a.write(array, function(error) {
    t.error(error, 'no error on write array callback');
  });

  a.write('string', function(error) {
    var msg = 'has error on write string callback';
    if (!error) {
      t.fail(msg);
    } else {
      t.pass(msg)
    }
  });
});

test('[ AVRGIRL-STK500V2 ] ::read', function (t) {
  var a = new avrgirl(FLoptions);
  var buffer = new Buffer([0xff, 0x00, 0xff, 0xff, 0xff, 0xff]);

  t.plan(4);

  a.read(6, function(error, data) {
    t.ok(Buffer.isBuffer(data), 'result is in buffer format');
    t.equal(data.length, 6, 'read result length is expected');
    t.ok(buffer.equals(data), 'buffer read is expected value');
  });

  a.read('string', function(error, data) {
    var msg = 'returns error on read when passing string as length';
    if (!error) {
      t.fail(msg);
    } else {
      t.pass(msg)
    }
  });
});

test('[ AVRGIRL-STK500V2 ] ::sendCmd', function (t) {
  var a = new avrgirl(FLoptions);
  var cmd = new Buffer([0x01]);
  var buffer = new Buffer([0xff, 0x00, 0xff, 0xff, 0xff, 0xff]);

  t.plan(3);

  a.sendCmd(cmd, function(error) {
    t.error(error, 'no error on send buffer as command');
  });

  a.sendCmd(6, function(error) {
    var msg = 'returns error on send number as command';
    if (!error) {
      t.fail(msg);
    } else {
      t.pass(msg)
    }
  });

  a.sendCmd('hello', function(error) {
    var msg = 'returns error on send string as command';
    if (!error) {
      t.fail(msg);
    } else {
      t.pass(msg)
    }
  });
});

test('[ AVRGIRL-STK500V2 ] ::getSignature', function (t) {
  var a = new avrgirl(FLoptions);
  var spyw = sinon.spy(a, 'write');
  var spyr = sinon.spy(a, 'read');
  var buf = new Buffer([0x01]);

  t.plan(4);

  a.getSignature(function(error, data) {
    t.error(error, 'no error on call');
    t.ok(data, 'passed data into callback');
    t.ok(spyw.calledWith(buf), 'called write with correct cmd');
    t.ok(spyr.calledWith(17), 'called read with arg of 17');
  });
});

test('[ AVRGIRL-STK500V2 ] ::verifySignature', function (t) {
  var a = new avrgirl(FLoptions);
  var data = new Buffer([0x00, 0x00, 0x00, 0x01, 0x02, 0x03]);
  var sig2 = new Buffer([0x01, 0x02, 0x03]);
  var sig3 = new Buffer([0xf3, 0xf4, 0xf5]);

  t.plan(2);

  a.verifySignature(sig2, data, function(error) {
    t.error(error, 'no error on identical signatures');
  });

  a.verifySignature(sig3, data, function(error) {
    var msg = 'returns error on non matching signature';
    if (!error) {
      t.fail(msg);
    } else {
      t.pass(msg)
    }
  });
});

test('[ AVRGIRL-STK500V2 ] ::verifyProgrammer', function (t) {
  var a = new avrgirl(FLoptions);
  var sig1 = new Buffer([0xff, 0xff, 0xff]);
  var sig2 = new Buffer([0x00, 0x00, 0x00]);

  t.plan(2);

  a.verifyProgrammer(sig1, function(error) {
    t.error(error, 'no error on identical signatures');
  });

  a.verifyProgrammer(sig2, function(error) {
    var msg = 'returns error on non matching signature';
    if (!error) {
      t.fail(msg);
    } else {
      t.pass(msg)
    }
  });
});

