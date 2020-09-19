var async = require('async');
var c = require('./c');

const serialCom = port => {
  let responses = []
  let devMode = true
  const debug = devMode ? console.log : function() {}

  const open = () => port.open()

  const setUpInterface = callback => {
    port.open(function() {
      port.on('data', function(data) {
        debug('data', data);
        responses.push(data);
      });
      sync(function(error) {
        debug('sync success', error);
        return callback(error);
      });
    });
  }

  const close = () => {
    responses = [];
    port.close();
  }

  const write = (data, callback) => {
    // this will need to swap between 200 and 1000 depending on the command
    var drainDelay = 400;
    port.write(data, function(error, results) {
      if (error) { return callback(new Error(error)); }
      port.drain(function() {
        setTimeout(callback, drainDelay);
      });
    });
  }

  const read = (length, callback) => {
    var packet = responses.splice(0, length);
    return callback(null, packet[0]);
  }

  const sync = callback => {
    var attempts = 0;
    var signon = Buffer.from(c.SEQ_SIGN_ON);
    var drainDelay = 1000;
  
    function check() {
      read(17, function(error, data) {
        attempts += 1;
        if (!data) {
          if (attempts < 10) {
            debug("trying again")
            trySync();
          } else {
            debug('failure')
            callback(new Error('attempt to sync with programmer failed.'));
          }
        } else {
          debug('success');
          callback(null, data);
        }
      });
    }
  
    function trySync() {
      port.write(signon, function(error, results) {
        if (error) { return callback(new Error(error)); }
        port.drain(function() {
          setTimeout(check, 10);
        });
      });
    };
  
    trySync();
  }

  const protoSerialC = {
    setUpInterface,
    open,
    close,
    write,
    read,
    sync,
    responses,
  }

  return Object.create(protoSerialC)
}

module.exports = serialCom;
