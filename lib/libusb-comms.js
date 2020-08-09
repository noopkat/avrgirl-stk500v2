const { callbackify, promisify } = require('util');

function libusb (device) {
  this.device = device;
  this.conn = {};
  // *shakes fist at OSX*
  if (process.platform.toLowerCase() === 'darwin') {
    fixOSX.call(this);
  }
}

function fixOSX() {
  (function(self, __open) {
    self.device.__open = function() {
      __open.call(this);
      // injecting this line here to alleviate a bad error later
      this.__claimInterface(0);
    };
  })(this, this.device.__open);
};

libusb.prototype.open = function() {
  this.device.open();
};

libusb.prototype.close = function() {
  this.device.close();
};

libusb.prototype.setUpInterfaceAsync = async function () {
  if (!this.device.interfaces) {
    throw new Error('Failed to set up interface: device is not currently open.');
  }
  var endpoints = this.device.interfaces[0].endpoints;
  function checkep(ep) { return ep.direction === this.toString(); }

  var epin = endpoints.filter(checkep, 'in');
  var epout = endpoints.filter(checkep, 'out');

  if (!epin.length || !epout.length) {
    throw new Error('Failed to set up interface: could not find endpoint(s).');
  }

  this.conn.endpointOut = epout[0];
  this.conn.endpointIn = epin[0];
};

libusb.prototype.setUpInterface = callbackify(libusb.prototype.setUpInterfaceAsync);

libusb.prototype.write = function (buffer, callback) {
  this.conn.endpointOut.transfer(buffer, function (error) {
    callback(error);
  });
};

libusb.prototype.writeAsync = promisify(libusb.prototype.write);

libusb.prototype.read = function (length, callback) {
  this.conn.endpointIn.transfer(length, function (error, data) {
    callback(error, data);
  });
};

libusb.prototype.readAsync = promisify(libusb.prototype.read);

module.exports = libusb;
