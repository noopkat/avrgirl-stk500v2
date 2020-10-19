// harness
var test = require('tape');
// test helpers
var sinon = require('sinon');
var vserial = require('virtual-serialport');
//var vserialport = vserial.SerialPort;

// module to test
var serialcom = require('../lib/serialport-comms');

var device = new vserial('/dev/cu.usbmodem1411', {
  baudrate: 115200
}, false);
// stubby stub
device.open = function(callback) {
  if (callback) {
    return callback(null);
  }
  return;
};
device.close = function(callback) {
  if (callback) {
    return callback(null);
  }
  return;
};
device.drain = function(callback) {
  if (callback) {
    return callback(null);
  }
  return;
};

test('[ SERIALPORT-COMMS ] method presence', function (t) {
  var b = new serialcom(device);
  function isFn(name) {
    return typeof b[name] === 'function';
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

test('[ SERIALPORT-COMMS ] ::open', function (t) {
  var b = new serialcom(device);

  var spy = sinon.spy(device, 'open');

  t.plan(1);
  b.open();
  t.ok(spy.calledOnce, 'called device.open');
});

test('[ SERIALPORT-COMMS ] ::close', function (t) {
  var b = new serialcom(device);
  var spy = sinon.spy(device, 'close');

  t.plan(1);
  b.close();
  t.ok(spy.calledOnce, 'called device.close');
});

test('[ SERIALPORT-COMMS ] ::write', function (t) {
  var b = new serialcom(device);
  var buf = Buffer.from([0x01]);

  t.plan(2);

  var spy = sinon.spy(device, 'write');
  b.write(buf, function(error) {
    t.error(error, 'no error');
    var cond = (spy.calledOnce && spy.args[0][0] && buf.equals(spy.args[0][0]));
    t.ok(cond, 'called write method on correct endpoint with correct buffer arg');
  });
});

test('[ SERIALPORT-COMMS ] ::read', function (t) {
  var b = new serialcom(device);
  b.responses.push(Buffer.alloc(8));
  var spy = sinon.spy(b, 'read');
  t.plan(3);

  b.read(8, function(error, data){
    t.error(error, 'no error');
    t.ok(spy.calledWith(8), 'called read method on correct endpoint with arg 8');
    t.equals(data.length, 8, 'got data');
  });
});

test('[ SERIALPORT-COMMS ] ::setUpInterface', function (t) {
  var b = new serialcom(device);
  var stub = sinon.stub(b, 'sync', function(callback) {
    return callback(null);
  });

  t.plan(3);

  b.setUpInterface(function (error) {
    t.pass('interface set up and called back');
    t.error(error, 'no error');
    t.ok(stub.calledOnce, 'sync method called');
  });
});
