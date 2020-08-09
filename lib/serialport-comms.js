var async = require('async');
var c = require('./c');
const { promisify } = require('util');

function serialCom (port) {
  var self = this;
  this.device = port;
  this.responses = [];
  var devMode = true;
  this.debug = devMode ? console.log : function() {};

};

serialCom.prototype.open = function() {
  this.device.open();
};

serialCom.prototype.setUpInterface = function(callback) {
  var self = this;
  this.device.open(function() {
    self.device.on('data', function(data) {
      self.debug('data', data);
      self.responses.push(data);
    });
    self.sync(function(error) {
      self.debug('sync success', error);
      return callback(error);
    });
  });
};

serialCom.prototype.setUpInterfaceAsync = promisify(serialCom.prototype.setUpInterface);

serialCom.prototype.close = function() {
  this.responses = [];
  this.device.close();
};

serialCom.prototype.write = function(data, callback) {
  var self = this;
  // this will need to swap between 200 and 1000 depending on the command
  var drainDelay = 400;

  this.device.write(data, function(error, results) {
    if (error) { return callback(new Error(error)); }
    self.device.drain(function() {
      setTimeout(callback, drainDelay);
    });
  });
};

serialCom.prototype.writeAsync = promisify(serialCom.prototype.write);

serialCom.prototype.read = function(length, callback) {
  //this.debug(this.responses);
  var packet = this.responses.splice(0, length);
  return callback(null, packet[0]);
};

serialCom.prototype.readAsync = promisify(serialCom.prototype.read);

serialCom.prototype.sync = function(callback) {
  var self = this;
  var attempts = 0;
  var signon = Buffer.from(c.SEQ_SIGN_ON);
  var drainDelay = 1000;

  function check() {
    self.read(17, function(error, data) {
      attempts += 1;
      if (!data) {
        if (attempts < 10) {
          self.debug("trying again")
          trySync();
        } else {
          self.debug('failure')
          callback(new Error('attempt to sync with programmer failed.'));
        }
      } else {
        self.debug('success');
        callback(null, data);
      }
    });
  }

  function trySync() {
    self.device.write(signon, function(error, results) {
      if (error) { return callback(new Error(error)); }
      self.device.drain(function() {
        setTimeout(check, 10);
      });
    });
  };

  trySync();
};

module.exports = serialCom;
