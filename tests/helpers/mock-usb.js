// set up mock usb module for tests

var usb = {};

usb.setDebugLevel = function() {};

usb.findByIds = function (vid, pid) {
  var device = {
    interfaces: [],
     __open: function() {},
  };

  device.open = function() {
    this.interfaces.push({
      endpoints: [
        {
          direction: 'in',
          transfer: function (length, callback) {
            var buffer = new Buffer(length);
            return callback(null, buffer);
          }
        },
        {
          direction: 'out',
          transfer: function (buffer, callback) {
            return callback(null);
          }
        }
      ]
    });
  };
  device.close = function() {
    device.interfaces = [];
  };
  return device;
};

module.exports = usb;
