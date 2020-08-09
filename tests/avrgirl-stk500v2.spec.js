// harness
var test = require('tape');
// test helpers
var sinon = require('sinon');
var proxyquire = require('proxyquire');
var chip = require('./helpers/mock-chip');
var libusbmock = require('./helpers/mock-libusb-comms');
var usbmock = require('mock-usb');

// module to test
var avrgirl = proxyquire('../avrgirl-stk500v2', { './lib/libusb-comms': libusbmock });

// test options to pass in to most tests
var FLoptions = {
  chip: chip,
  comm: usbmock,
  debug: false,
  frameless: true
};

function testBuffer(spy, call, arg, buffer) {
  return (spy.called && spy.args[call][arg] && buffer.equals(spy.args[call][arg]));
};

// run c tests
require('./c.spec');

test('[ AVRGIRL-STK500V2 ] initialise', function (t) {
  var a = new avrgirl(FLoptions);
  t.equal(typeof a, 'object', 'new is object');
  t.equal(Object.keys(a.options).length, 4, 'options has 4 props');
  t.end();
});

test('[ AVRGIRL-STK500V2 ] device ready', function (t) {
  var a = new avrgirl(FLoptions);
  a.on('ready', function() {
    t.ok(typeof a.device === 'object', 'device created');
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
    'loadAddress',
    'loadPage',
    'writeMem',
    'readMem',
    'enterProgrammingMode',
    'exitProgrammingMode',
    'eraseChip',
    'writeFlash',
    'writeEeprom',
    'readFlash',
    'readEeprom',
    'getChipSignature',
    'readFuses',
    'readFuse',
    'writeFuse',
    'cmdSpiMulti',
    'setParameter',
    'getParameter'
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
  var buffer = Buffer.from([0xff, 0xff, 0xff, 0xff]);
  var framedExample = Buffer.from([0x1b, 0x00, 0x00, 0x04, 0x0e, 0xff, 0xff, 0xff, 0xff, 0x11]);
  var framed = a.frame(buffer);

  t.ok(Buffer.isBuffer(buffer), 'returned result is a buffer');
  t.equal(framed.length, 10, 'returned result length is correct');
  t.ok(framed.equals(framedExample), 'returned result equals expected value');
  t.end();
});

test('[ AVRGIRL-STK500V2 ] ::write', function (t) {
  var a = new avrgirl(FLoptions);
  var buffer = Buffer.from([0xff, 0xff, 0xff, 0xff]);
  var array = [0xff, 0xff, 0xff, 0xff];

  t.plan(3);

  a.write(buffer, function(error) {
    t.error(error, 'no error on write buffer callback');
  });

  a.write(array, function(error) {
    t.error(error, 'no error on write array callback');
  });

  a.write('string', function(error) {
    t.ok(error, 'has error on write string callback');
  });
});

test('[ AVRGIRL-STK500V2 ] ::read', function (t) {
  var a = new avrgirl(FLoptions);
  var buffer = Buffer.from([0xff, 0x00, 0xff, 0xff, 0xff, 0xff]);

  t.plan(4);

  a.read(6, function(error, data) {
    t.ok(Buffer.isBuffer(data), 'result is in buffer format');
    t.equal(data.length, 6, 'read result length is expected');
    t.ok(data.equals(buffer), 'buffer read is expected value');
  });

  a.read('string', function(error, data) {
    t.ok(error, 'returns error on read when passing string as length');
  });
});

test('[ AVRGIRL-STK500V2 ] ::sendCmd', function (t) {
  var a = new avrgirl(FLoptions);
  var cmd = Buffer.from([0x01]);
  var buffer = Buffer.from([0xff, 0x00, 0xff, 0xff, 0xff, 0xff]);

  t.plan(3);

  a.sendCmd(cmd, function(error) {
    t.error(error, 'no error on send buffer as command');
  });

  a.sendCmd(6, function(error) {
    t.ok(error, 'returns error on send number as command');
  });

  a.sendCmd('hello', function(error) {
    t.ok(error, 'returns error on send string as command');
  });
});

test('[ AVRGIRL-STK500V2 ] ::getSignature', function (t) {
  var a = new avrgirl(FLoptions);
  var spyw = sinon.spy(a, 'writeAsync');
  var spyr = sinon.spy(a, 'readAsync');
  var buf = Buffer.from([0x01]);

  t.plan(3);

  a.getSignature(function(error, data) {
    t.error(error, 'no error on call');
    t.ok(data, 'passed data into callback');
    t.ok(testBuffer(spyw, 0, 0, buf), 'called write with correct cmd');
  });
});

test('[ AVRGIRL-STK500V2 ] ::verifySignature', function (t) {
  var a = new avrgirl(FLoptions);
  var data = Buffer.from([0x01, 0x02, 0x03]);
  var sig2 = Buffer.from([0x01, 0x02, 0x03]);
  var sig3 = Buffer.from([0xf3, 0xf4, 0xf5]);

  t.plan(2);

  a.verifySignature(sig2, data, function(error) {
    t.error(error, 'no error on identical signatures');
  });

  a.verifySignature(sig3, data, function(error) {
    t.ok(error, 'returns error on non matching signature');
  });
});

test('[ AVRGIRL-STK500V2 ] ::loadAddress', function (t) {
  var a = new avrgirl(FLoptions);
  var spy = sinon.spy(a, 'sendCmdAsync');
  var dMSB1 = 0x80;
  var dMSB2 = 0x00;
  var msb1 = (0 >> 24) & 0xFF | dMSB1;
  var msb2 = (0 >> 24) & 0xFF | dMSB2;
  var xsb = (0 >> 16) & 0xFF;
  var ysb = (0 >> 8) & 0xFF;
  var lsb = 0 & 0xFF;

  var buf1 = Buffer.from([0x06, msb1, xsb, ysb, lsb]);
  var buf2 = Buffer.from([0x06, msb2, xsb, ysb, lsb]);
  t.plan(4);

  a.loadAddress('flash', 0, function(error) {
    t.ok(testBuffer(spy, 0, 0, buf1), 'flash: called sendCmd with correct cmd');
    t.error(error, 'no error on callback');
  });

  a.loadAddress('eeprom', 0, function(error) {
    t.ok(testBuffer(spy, 1, 0, buf2), 'eeprom: called sendCmd with correct cmd');
    t.error(error, 'no error on callback');
  });
});

test('[ AVRGIRL-STK500V2 ] ::loadPage', function (t) {
  var a = new avrgirl(FLoptions);
  var spy = sinon.spy(a, 'sendCmdAsync');
  var lMSB = 5 >> 8;
  var lLSB = 5 & 0xFF;
  var data = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  var baddata = [0xFF, 0xFF, 0xFF, 0xFF, 0xFF];
  var buf1 = Buffer.from([0x13, lMSB, lLSB, 0xC1, 6, 0x40, 0x4C, 0x20, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  var buf2 = Buffer.from([0x15, lMSB, lLSB, 0xC1, 6, 0xC1, 0xC2, 0xA0, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);

  t.plan(5);

  a.loadPage('flash', data, function(error) {
    t.ok(testBuffer(spy, 0, 0, buf1), 'flash: called sendCmd with correct cmd');
    t.error(error, 'flash: no error on callback');
  });

  a.loadPage('eeprom', data, function(error) {
    t.ok(testBuffer(spy, 1, 0, buf2), 'eeprom: called sendCmd with correct cmd');
    t.error(error, 'eeprom: no error on callback');
  });

  a.loadPage('eeprom', baddata, function(error) {
    t.ok(error, 'error when data arg is not a buffer');
  });
});

test('[ AVRGIRL-STK500V2 ] ::enterProgrammingMode', function (t) {
  var a = new avrgirl(FLoptions);
  var spy = sinon.spy(a, 'sendCmdAsync');
  var buf = Buffer.from([0x10, 0xC8, 0x64, 0x19, 0x20, 0x00, 0x53, 0x03, 0xAC, 0x53, 0x00, 0x00]);

  t.plan(2);

  a.enterProgrammingMode(function(error) {
    t.ok(testBuffer(spy, 0, 0, buf), 'called sendCmd with correct cmd');
    t.error(error, 'no error on callback');
  });
});

test('[ AVRGIRL-STK500V2 ] ::exitProgrammingMode', function (t) {
  var a = new avrgirl(FLoptions);
  var spy = sinon.spy(a, 'sendCmdAsync');
  var buf = Buffer.from([0x11, 0x01, 0x01]);

  t.plan(2);

  a.exitProgrammingMode(function(error) {
    t.ok(testBuffer(spy, 0, 0, buf), 'called sendCmd with correct cmd');
    t.error(error, 'no error on callback');
  });
});

test('[ AVRGIRL-STK500V2 ] ::eraseChip', function (t) {
  var a = new avrgirl(FLoptions);
  var spy = sinon.spy(a, 'sendCmdAsync');
  var buf = Buffer.from([0x12, 10, 0x01, 0xAC, 0x80, 0x00, 0x00]);

  t.plan(2);

  a.eraseChip(function(error) {
    t.ok(testBuffer(spy, 0, 0, buf), 'called sendCmd with correct cmd');
    t.error(error, 'no error on callback');
  });
});

test('[ AVRGIRL-STK500V2 ] ::readMem', function (t) {
  var a = new avrgirl(FLoptions);
  var spyw = sinon.spy(a, 'write');
  var spyr = sinon.spy(a, 'read');
  var lMSB = 0x04 >> 8;
  var lLSB = 0x04;
  var buf1 = Buffer.from([0x14, lMSB, lLSB, 0x20]);
  var buf2 = Buffer.from([0x16, lMSB, lLSB, 0xA0]);

  t.plan(10);

  a.readMem('flash', 0x04, function(error, data) {
    t.error(error, 'flash: no error on call');
    t.ok(data, 'flash: passed data into callback');
    t.equals(data.length, 7, 'flash: read returned 7 bytes of data');
    t.ok(testBuffer(spyw, 0, 0, buf1), 'flash: called write with correct cmd');
    t.ok(spyr.calledWith(7), 'flash: called read with arg of 7');
  });

  console.log(' ');

  a.readMem('eeprom', 0x04, function(error, data) {
    t.error(error, 'eeprom: no error on call');
    t.ok(data, 'eeprom: passed data into callback');
    t.equals(data.length, 7, 'eeprom: read returned 7 bytes of data');
    t.ok(testBuffer(spyw, 1, 0, buf2), 'eeprom: called write with correct cmd');
    t.ok(spyr.calledWith(7), 'eeprom: called read with arg of 7');
  });
});

test('[ AVRGIRL-STK500V2 ] ::setParameter', function (t) {
  var a = new avrgirl(FLoptions);
  var spy = sinon.spy(a, 'sendCmd');
  var buf = Buffer.from([0x02, 0x98, 0x01]);

  t.plan(2);

  a.setParameter(0x98, 0x01, function(error) {
    t.ok(testBuffer(spy, 0, 0, buf), 'called sendCmd with correct cmd');
    t.error(error, 'no error on callback');
  });
});

test('[ AVRGIRL-STK500V2 ] ::getParameter', function (t) {
  var a = new avrgirl(FLoptions);
  var spyw = sinon.spy(a, 'write');
  var spyr = sinon.spy(a, 'read');
  var buf = Buffer.from([0x03, 0x98]);

  t.plan(4);

  a.getParameter(0x98, function(error, data) {
    t.ok(testBuffer(spyw, 0, 0, buf), 'called write with correct cmd');
    t.ok(spyr.calledWith(8), 'called read with correct length');
    t.error(error, 'no error on callback');
    t.ok(data, 'got paramater data back');
  });
});

test('[ AVRGIRL-STK500V2 ] ::readFuses', function (t) {
  var a = new avrgirl(FLoptions);
  var spyw = sinon.spy(a, 'write');
  var spyr = sinon.spy(a, 'read');
  var fuses = 3;

  t.plan(5);

  a.readFuses(function(error, data) {
    t.equals(spyw.callCount, fuses, 'called write for each fuse');
    t.equals(spyr.callCount, fuses, 'called read for each fuse');
    t.error(error, 'no error on callback');
    t.equals(typeof data, 'object', 'got parameter data back, type is object');
    t.equals(Object.keys(data).length, fuses, 'got parameter data back, correct length');
  });
});

test('[ AVRGIRL-STK500V2 ] ::readFuse', function (t) {
  var a = new avrgirl(FLoptions);
  var spyw = sinon.spy(a, 'write');
  var spyr = sinon.spy(a, 'read');

  t.plan(6);

  a.readFuse('high', function(error, data) {
    t.ok(spyw.calledOnce, 'called write once');
    t.ok(spyr.calledOnce, 'called read once');
    t.error(error, 'no error on callback');
    t.ok(Buffer.isBuffer(data), 'got parameter data back, type is buffer');
    t.equals(data.length, 1, 'got parameter data back, correct length');
  });

  a.readFuse(8, function(error, data) {
    t.ok(error, 'error on callback when passing non string fuseType');
  });
});

// TODO: test for data length being too large, return error
test('[ AVRGIRL-STK500V2 ] ::writeFlash', function (t) {
  var a = new avrgirl(FLoptions);
  var spy = sinon.spy(a, 'writeMemAsync');
  var tinydata = Buffer.alloc(50);
  var largedata = Buffer.alloc(500);
  var file = __dirname + '/data/pr.hex';

  t.plan(8);

  a.writeFlash(tinydata, function(error) {
    t.ok(spy.calledWith('flash'), 'one page: called writeMem with correct memtype');
    t.ok(testBuffer(spy, 0, 1, tinydata), 'one page: called writeMem with correct buffer');
    t.error(error, 'one page: no error on callback');
  });
  console.log(' ');
  a.writeFlash(largedata, function(error) {
    t.ok(spy.calledWith('flash'), 'multiple pages: called writeMem with correct memtype');
    t.ok(testBuffer(spy, 1, 1, largedata), 'multiple pages: called writeMem with correct buffer');
    t.error(error, 'multiple pages: no error on callback');
  });
  console.log(' ');
  a.writeFlash(file, function(error) {
    t.ok(spy.calledWith('flash'), 'filepath string: called writeMem with correct memtype');
    t.error(error, 'filepath string: no error on callback');
  });
});

// TODO: test for data length being too large, return error
test('[ AVRGIRL-STK500V2 ] ::writeEeprom', function (t) {
  var a = new avrgirl(FLoptions);
  var spy = sinon.spy(a, 'writeMemAsync');
  var tinydata = Buffer.alloc(3);
  var largedata = Buffer.alloc(20);
  var file = __dirname + '/data/eeprom.hex';

  t.plan(8);

  a.writeEeprom(tinydata, function(error) {
    t.ok(spy.calledWith('eeprom'), 'one page: called writeMem with correct memtype');
    t.ok(testBuffer(spy, 0, 1, tinydata), 'one page: called writeMem with correct buffer');
    t.error(error, 'no error on callback');
  });
  console.log(' ');
  a.writeEeprom(largedata, function(error) {
    t.ok(spy.calledWith('eeprom'), 'one page: called writeMem with correct memtype');
    t.ok(testBuffer(spy, 1, 1, largedata), 'one page: called writeMem with correct buffer');
    t.error(error, 'no error on callback');
  });
  console.log(' ');
  a.writeEeprom(file, function(error) {
    t.ok(spy.calledWith('eeprom'), 'filepath string: called writeMem with correct memtype');
    t.error(error, 'filepath string: no error on callback');
  });
});

test('[ AVRGIRL-STK500V2 ] ::readEeprom', function (t) {
  var a = new avrgirl(FLoptions);
  var spy = sinon.spy(a, 'readMemAsync');
  var length = 20;

  t.plan(3);

  a.readEeprom(length, function(error, data) {
    t.ok(spy.calledWith('eeprom', length), 'called readMem with correct length arg');
    t.equals(data.length, length + 3, 'data returned is correct length');
    t.error(error, 'no error on callback');
  });
});

test('[ AVRGIRL-STK500V2 ] ::readFlash', function (t) {
  var a = new avrgirl(FLoptions);
  var spy = sinon.spy(a, 'readMemAsync');
  var length = 20;

  t.plan(3);

  a.readFlash(length, function(error, data) {
    t.ok(spy.calledWith('flash', length), 'called readMem with correct length arg');
    t.equals(data.length, length + 3, 'data returned is correct length');
    t.error(error, 'no error on callback');
  });
});

// this is very shallow - the async whilst functions should be broken out into a halper object
// so that they are properly unit testable.
test('[ AVRGIRL-STK500V2 ] ::writeMem', function (t) {
  var a = new avrgirl(FLoptions);
  var tinyfdata = Buffer.alloc(50);
  var largefdata = Buffer.alloc(500);
  var tinyedata = Buffer.alloc(3);
  var largeedata = Buffer.alloc(50);

  t.plan(4);

  a.writeMem('flash', tinyfdata, function(error) {
    t.error(error, 'flash tiny: no error on callback');
  });

  a.writeMem('flash', largefdata, function(error) {
    t.error(error, 'flash large: no error on callback');
  });

  a.writeMem('eeprom', tinyedata, function(error) {
    t.error(error, 'eeprom tiny: no error on callback');
  });

  a.writeMem('eeprom', largeedata, function(error) {
    t.error(error, 'eeprom large: no error on callback');
  });
});

test('[ AVRGIRL-STK500V2 ] ::quickFlash', function (t) {
  var a = new avrgirl(FLoptions);
  var spyEnter = sinon.spy(a, 'enterProgrammingModeAsync');
  var spyw = sinon.spy(a, 'writeFlashAsync');
  var spyExit = sinon.spy(a, 'exitProgrammingModeAsync');
  var file = __dirname + '/data/pr.hex';

  t.plan(4);

  a.quickFlash(file, function(error) {
    t.ok(spyEnter.calledOnce, 'called enterProgrammingMode');
    t.ok(spyw.calledOnce, 'called writeFlash');
    t.ok(spyExit.calledOnce, 'called exitProgrammingMode');
    t.error(error, 'no error on callback');
  });
});

test('[ AVRGIRL-STK500V2 ] ::quickEeprom', function (t) {
  var a = new avrgirl(FLoptions);
  var spyEnter = sinon.spy(a, 'enterProgrammingModeAsync');
  var spyw = sinon.spy(a, 'writeEepromAsync');
  var spyExit = sinon.spy(a, 'exitProgrammingModeAsync');
  var file = __dirname + '/data/eeprom.hex';

  t.plan(4);

  a.quickEeprom(file, function(error) {
    t.ok(spyEnter.calledOnce, 'called enterProgrammingMode');
    t.ok(spyw.calledOnce, 'called writeEeprom');
    t.ok(spyExit.calledOnce, 'called exitProgrammingMode');
    t.error(error, 'no error on callback');
  });
});

test('[ AVRGIRL-STK500V2 ] ::getChipSignature', function (t) {
  var a = new avrgirl(FLoptions);
  var spyw = sinon.spy(a, 'write');
  var spyr = sinon.spy(a, 'read');
  var count = 3;

  t.plan(5);

  a.getChipSignature(function(error, data) {
    t.equals(spyw.callCount, count, 'called write for each byte');
    t.equals(spyr.callCount, count, 'called read for each byte');
    t.error(error, 'no error on callback');
    t.equals(typeof data, 'object', 'got parameter data back, type is object');
    t.equals(data.length, count, 'got parameter data back, correct length');
  });
});

test('[ AVRGIRL-STK500V2 ] ::writeFuse', function (t) {
  var a = new avrgirl(FLoptions);
  var buf = Buffer.from([0x17, 0xAC, 0xA4, 0x00, 0xFF]);
  var spyw = sinon.spy(a, 'write');
  var spyr = sinon.spy(a, 'read');

  t.plan(3);

  a.writeFuse('ext', 0xFF, function(error, data) {
    t.ok(testBuffer(spyw, 0, 0, buf), 'called write with correct buffer');
    t.ok(spyr.calledWith(3), 'called read with correct length arg');
    t.error(error, 'no error on callback');
  });
});

require('./libusb-comms.spec');
require('./serialport-comms.spec');

