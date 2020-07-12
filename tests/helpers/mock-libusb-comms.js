function libusb (device) {
  this.device = device;
  this.conn = {};
}

libusb.prototype.open = function() {};

libusb.prototype.close = function() {};

libusb.prototype.setUpInterface = function (callback) {
  callback(null);
};

libusb.prototype.write = function (buffer, callback) {
  callback(null);
};

libusb.prototype.read = function (length, callback) {
  var data = Buffer.alloc(length);
  data.fill(0xFF);
  data[1] = 0x00;
  callback(null, data);
};

module.exports = libusb;
