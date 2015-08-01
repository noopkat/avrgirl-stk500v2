function libusb(device) {
  this.device = device;
  this.conn = {};
  // *shakes fist at OSX*
  (function(self, __open) {
    self.device.__open = function() {
      __open.call(this);
      // injecting this line here to alleviate a bad error later
      this.__claimInterface(0);
    };
  })(this, this.device.__open);
}

libusb.prototype.open = function() {
  this.device.open();
};

libusb.prototype.close = function() {
  this.device.close();
};

libusb.prototype.setUpInterface = function(callback) {
  if (!this.device.interfaces) { callback(new Error('Failed to set up interfaces: device is not currently open.')); }
  this.conn.endpointOut = this.device.interfaces[0].endpoints[1];
  this.conn.endpointIn = this.device.interfaces[0].endpoints[0];
  callback(null);
};

module.exports = libusb;
