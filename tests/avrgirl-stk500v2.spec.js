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
    'readMem',
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

test('[ AVRGIRL-STK500V2 ] ::loadAddress', function (t) {
  var a = new avrgirl(FLoptions);
  var spy = sinon.spy(a, 'sendCmd');
  var dMSB1 = 0x80;
  var dMSB2 = 0x00;
  var msb1 = (0 >> 24) & 0xFF | dMSB1;
  var msb2 = (0 >> 24) & 0xFF | dMSB2;
  var xsb = (0 >> 16) & 0xFF;
  var ysb = (0 >> 8) & 0xFF;
  var lsb = 0 & 0xFF;

  var buf1 = new Buffer([0x06, msb1, xsb, ysb, lsb]);
  var buf2 = new Buffer([0x06, msb2, xsb, ysb, lsb]);
  t.plan(4);

  a.loadAddress('flash', 0, function(error) {
    t.ok(spy.calledWith(buf1), 'flash: called sendCmd with correct cmd');
    t.error(error, 'no error on callback');
  });

  a.loadAddress('eeprom', 0, function(error) {
    t.ok(spy.calledWith(buf2), 'flash: called sendCmd with correct cmd');
    t.error(error, 'no error on callback');
  });
});

test('[ AVRGIRL-STK500V2 ] ::loadPage', function (t) {
  var a = new avrgirl(FLoptions);
  var spy = sinon.spy(a, 'sendCmd');
  var lMSB = 5 >> 8;
  var lLSB = 5 & 0xFF;
  var data = new Buffer([0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  var baddata = [0xFF, 0xFF, 0xFF, 0xFF, 0xFF];
  var buf1 = new Buffer([0x13, lMSB, lLSB, 0xC1, 6, 0x40, 0x4C, 0x20, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  var buf2 = new Buffer([0x15, lMSB, lLSB, 0xC1, 6, 0xC1, 0xC2, 0xA0, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);

  t.plan(5);

  a.loadPage('flash', data, function(error) {
    t.ok(spy.calledWith(buf1), 'flash: called sendCmd with correct cmd');
    t.error(error, 'flash: no error on callback');
  });

  a.loadPage('eeprom', data, function(error) {
    t.ok(spy.calledWith(buf2), 'eeprom: called sendCmd with correct cmd');
    t.error(error, 'eeprom: no error on callback');
  });

  a.loadPage('eeprom', baddata, function(error) {
    t.ok(error, 'error when data arg is not a buffer');
  });
});

test('[ AVRGIRL-STK500V2 ] ::enterProgrammingMode', function (t) {
  var a = new avrgirl(FLoptions);
  var spy = sinon.spy(a, 'sendCmd');
  var buf = new Buffer([0x10, 0xC8, 0x64, 0x19, 0x20, 0x00, 0x53, 0x03, 0xAC, 0x53, 0x00, 0x00]);

  t.plan(2);

  a.enterProgrammingMode(function(error) {
    t.ok(spy.calledWith(buf), 'called sendCmd with correct cmd');
    t.error(error, 'no error on callback');
  });
});

test('[ AVRGIRL-STK500V2 ] ::exitProgrammingMode', function (t) {
  var a = new avrgirl(FLoptions);
  var spy = sinon.spy(a, 'sendCmd');
  var buf = new Buffer([0x11, 0x01, 0x01]);

  t.plan(2);

  a.exitProgrammingMode(function(error) {
    t.ok(spy.calledWith(buf), 'called sendCmd with correct cmd');
    t.error(error, 'no error on callback');
  });
});

test('[ AVRGIRL-STK500V2 ] ::eraseChip', function (t) {
  var a = new avrgirl(FLoptions);
  var spy = sinon.spy(a, 'sendCmd');
  var buf = new Buffer([0x12, 10, 0x01, 0xAC, 0x80, 0x00, 0x00]);

  t.plan(2);

  a.eraseChip(function(error) {
    t.ok(spy.calledWith(buf), 'called sendCmd with correct cmd');
    t.error(error, 'no error on callback');
  });
});

test('[ AVRGIRL-STK500V2 ] ::readMem', function (t) {
  var a = new avrgirl(FLoptions);
  var spyw = sinon.spy(a, 'write');
  var spyr = sinon.spy(a, 'read');
  var lMSB = 0x04 >> 8;
  var lLSB = 0x04;
  var buf1 = new Buffer([0x14, lMSB, lLSB, 0x20]);
  var buf2 = new Buffer([0x16, lMSB, lLSB, 0xA0]);

  t.plan(10);

  a.readMem('flash', 0x04, function(error, data) {
    t.error(error, 'flash: no error on call');
    t.ok(data, 'flash: passed data into callback');
    t.equals(data.length, 7, 'flash: read returned 7 bytes of data');
    t.ok(spyw.calledWith(buf1), 'flash: called write with correct cmd');
    t.ok(spyr.calledWith(7), 'flash: called read with arg of 7');
  });

  console.log(' ');

  a.readMem('eeprom', 0x04, function(error, data) {
    t.error(error, 'eeprom: no error on call');
    t.ok(data, 'eeprom: passed data into callback');
    t.equals(data.length, 7, 'eeprom: read returned 7 bytes of data');
    t.ok(spyw.calledWith(buf2), 'eeprom: called write with correct cmd');
    t.ok(spyr.calledWith(7), 'eeprom: called read with arg of 7');
  });
});

test('[ AVRGIRL-STK500V2 ] ::setParameter', function (t) {
  var a = new avrgirl(FLoptions);
  var spy = sinon.spy(a, 'sendCmd');
  var buf = new Buffer([0x02, 0x98, 0x01]);

  t.plan(2);

  a.setParameter(0x98, 0x01, function(error) {
    t.ok(spy.calledWith(buf), 'called sendCmd with correct cmd');
    t.error(error, 'no error on callback');
  });
});

test('[ AVRGIRL-STK500V2 ] ::getParameter', function (t) {
  var a = new avrgirl(FLoptions);
  var spyw = sinon.spy(a, 'write');
  var spyr = sinon.spy(a, 'read');
  var buf = new Buffer([0x03, 0x98]);

  t.plan(4);

  a.getParameter(0x98, function(error, data) {
    t.ok(spyw.calledWith(buf), 'called write with correct cmd');
    t.ok(spyr.calledWith(8), 'called read with correct length');
    t.error(error, 'no error on callback');
    t.ok(data, 'got paramater data back');
  });
});

// TODO:
// readChipSignature
// readFuses
// writeMem

require('./libusb-comms.spec');

