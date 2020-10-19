const { promisify } = require('util');

function libusb (device) {
  this.device = device;
  this.conn = {};
}

libusb.prototype.open = function() {};

libusb.prototype.close = function() {};

libusb.prototype.setUpInterface = function (callback) {
  callback(null);
};

libusb.prototype.setUpInterfaceAsync = promisify(libusb.prototype.setUpInterface);

libusb.prototype.write = function (buffer, callback) {
  callback(null);
};

libusb.prototype.writeAsync = promisify(libusb.prototype.write);

libusb.prototype.read = function (length, callback) {
  var data = Buffer.alloc(length);
  data.fill(0xFF);
  data[1] = 0x00;
  callback(null, data);
};

libusb.prototype.readAsync = promisify(libusb.prototype.read);

module.exports = libusb;
