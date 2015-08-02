var C = require('./lib/c');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var async = require('async');
var libusb = require('./lib/libusb-comms');

function avrgirlStk500v2(options) {
  this.options = {
    comm: options.comm || null,
    chip: options.chip || null,
    debug: options.debug || false,
    frameless: options.frameless || false
  };
  this.seq = 0;
  this.debug = this.options.debug ? console.log : function() {};

  // if (this.options.comm.deviceDescriptor && typeof this.options.comm.deviceDescriptor === 'object') {
  //     this.commType = 'libusb';
  //  }

  // evenutally wrap the following line with the conditional above
  this.device = new libusb(this.options.comm);

  EventEmitter.call(this);
  this._setupComms();
};

util.inherits(avrgirlStk500v2, EventEmitter);

avrgirlStk500v2.prototype._setupComms = function() {
  this.debug('setting up communication interface');
  var self = this;
  // libusb
  this.open();
  this.device.setUpInterface(function(error) {
    if (!error) {
      setImmediate(emitReady, self);
    }
  });
}

function emitReady(self) {
  self.emit('ready');
}

avrgirlStk500v2.prototype.open = function() {
  this.device.open();
};

avrgirlStk500v2.prototype.close = function() {
  this.device.close();
};

avrgirlStk500v2.prototype.frame = function (buffer) {
  var lMSB = buffer.length >> 8;
  var lLSB = buffer.length & 0xFF;
  var head = new Buffer([0x1B, this.seq, lMSB, lLSB, C.TOKEN]);
  var headed = Buffer.concat([head, buffer]);

  var checksum = 0;
  for (var i = 0; i < headed.length; i += 1) {
    checksum ^= headed[i];
  }

  this.seq += 1;

  var framed = Buffer.concat([headed, new Buffer([checksum])]);
  return framed;
};

avrgirlStk500v2.prototype.write = function (buffer, callback) {
  if (!Buffer.isBuffer(buffer)) {
    if (!Array.isArray(buffer)) {
      return callback(new Error('Failed to write: data was not Buffer or Array object.'));
    }
    var buffer = new Buffer(buffer);
  }

  var data = (this.options.frameless) ? buffer : this.frame(buffer);

  this.device.write(data, function (error) {
    callback(error);
  });
};

avrgirlStk500v2.prototype.read = function (length, callback) {
  var self = this;
  if (typeof length !== 'number') { return callback(new Error('Failed to read: length must be a number.')) }
  this.device.read(length, function (error, data) {
    var buffer = (self.options.frameless) ? data : data.slice(6);
    callback(error, buffer);
  });
};

avrgirlStk500v2.prototype.sendCmd = function(cmd, callback) {
  var self = this;
  this.write(cmd, function (error) {
    if (error) { return callback(error); }
    self.read(2, function (error, data) {
      if (!error && data.length > 0 && data[1] !== C.STATUS_CMD_OK) {
        var error = new Error('Return status was not OK. Received instead: ' + data.toString('hex'));
      }
      callback(error);
    });
  });
};

avrgirlStk500v2.prototype.getSignature = function (callback) {
  var self = this;
  var cmd = new Buffer([C.CMD_SIGN_ON]);
  var length = 17;

  this.write(cmd, function (error) {
    if (error) { callback(error); }
    self.read(length, function (error, data) {
      callback(error, data);
    });
  });
};

avrgirlStk500v2.prototype.verifySignature = function (sig, data, callback) {
  var error = null;
  if (data[1] === C.STATUS_CMD_OK) {
    var signature = data.slice(3, 3 + sig.length);
    if (!signature.equals(sig)) {
      error = new Error('Failed to verify: programmer signature does not match.');
    }
  } else {
    error = new Error('Failed to verify: programmer return status was not OK.');
  }
  callback(error);
};

avrgirlStk500v2.prototype.verifyProgrammer = function (sig, callback) {
  var self = this;

  this.getSignature(function (error, data) {
    self.verifySignature(sig, data, function(error) {
      callback(error);
    });
  });
};

avrgirlStk500v2.prototype.loadAddress = function (memType, address, callback) {
  var dMSB = memType === 'flash' ? 0x80 : 0x00;
  var msb = (address >> 24) & 0xFF | dMSB;
  var xsb = (address >> 16) & 0xFF;
  var ysb = (address >> 8) & 0xFF;
  var lsb = address & 0xFF;

  var cmd = new Buffer([C.CMD_LOAD_ADDRESS, msb, xsb, ysb, lsb]);

  this.sendCmd(cmd, function (error) {
    var error = error ? new Error('Failed to load address: return status was not OK.') : null;
    callback(error);
  });
};

avrgirlStk500v2.prototype.loadPage = function (memType, data, callback) {
  if (!Buffer.isBuffer(data)) {
    return callback(new Error('Failed to write page: data was not Buffer'));
  }

  var lMSB = data.length >> 8;
  var lLSB = data.length & 0xFF;
  var mem = this.options.chip[memType];
  var cmd = memType === 'flash' ? C.CMD_PROGRAM_FLASH_ISP : C.CMD_PROGRAM_EEPROM_ISP

  var cmd = new Buffer([
    cmd,
    lMSB, lLSB,
    mem.mode, mem.delay,
    mem.write[0], mem.write[1], mem.write[2],
    mem.poll1, mem.poll2
  ]);

  cmd = Buffer.concat([cmd, data]);

  this.sendCmd(cmd, function (error) {
    callback(error);
  });
};

avrgirlStk500v2.prototype.writeMem = function (memType, hex, callback) {
  var self = this;
  var options = this.options.chip;
  var pageAddress = 0;
  var useAddress;
  var pageSize = options[memType].pageSize;
  var addressOffset = options[memType].addressOffset;
  var data;

  async.whilst(
    function testEndOfFile() { return pageAddress < hex.length; },
    function programPage(pagedone) {
      async.series([
        function loadAddress(done) {
          useAddress = pageAddress >> addressOffset;
          self.loadAddress(memType, useAddress, done);
        },
        function writeToPage(done) {
          data = hex.slice(pageAddress, (hex.length > pageSize ? (pageAddress + pageSize) : hex.length - 1))
          self.loadPage(memType, data, done);
        },
        function calcNextPage(done) {
          pageAddress = pageAddress + data.length;
          done();
        }
      ],
      function pageIsDone(error) {
        pagedone(error);
      });
    },
    function(error) {
      callback(error);
    }
  );
};

avrgirlStk500v2.prototype.enterProgrammingMode = function (callback) {
  var self = this;
  var options = this.options.chip;
  var enable = options.pgmEnable;

  var cmd = new Buffer([
    C.CMD_ENTER_PROGMODE_ISP,
    options.timeout, options.stabDelay,
    options.cmdexeDelay, options.syncLoops,
    options.byteDelay,
    options.pollValue, options.pollIndex,
    enable[0], enable[1],
    enable[2], enable[3]
  ]);

  this.sendCmd(cmd, function (error) {
    var error = error ? new Error('Failed to enter prog mode: programmer return status was not OK.') : null;
    callback(error);
  });
};

avrgirlStk500v2.prototype.exitProgrammingMode = function (callback) {
  var self = this;
  var options = this.options.chip;

  var cmd = new Buffer([
    C.CMD_LEAVE_PROGMODE_ISP, options.preDelay, options.postDelay
  ]);

  this.sendCmd(cmd, function (error) {
    var error = error ? new Error('Failed to leave prog mode: programmer return status was not OK.') : null;
    callback(error);
  });
};

avrgirlStk500v2.prototype.eraseChip = function (callback) {
  var self = this;
  var options = this.options.chip;
  var erase = options.erase;

  var cmd = new Buffer([
    C.CMD_CHIP_ERASE_ISP,
    erase.delay, options.pollMethod,
    erase.cmd[0], erase.cmd[1],
    erase.cmd[2], erase.cmd[3]
  ]);

  this.sendCmd(cmd, function (error) {
    var error = error ? new Error('Failed to erase chip: programmer return status was not OK.') : null;
    callback(error);
  });
};

avrgirlStk500v2.prototype.writeFlash = function (hex, callback) {
  // optional convenience method
};

avrgirlStk500v2.prototype.writeEeprom = function (hex, callback) {
 // optional convenience method
};

avrgirlStk500v2.prototype.readMem = function (memType, length, callback) {
  var self = this;
  var options = this.options.chip;
  var cmd = memType === 'flash' ? C.CMD_READ_FLASH_ISP : C.CMD_READ_EEPROM_ISP
  var buf = new Buffer([
    cmd,
    length >> 8, length,
    options[memType].read[0]
  ]);

  this.write(buf, function (error) {
    var error = error ? new Error('Failed to initiate read memory: programmer return status was not OK.') : null;
    if (error) { return callback(error, null); }
    self.read(length + 3, function(error, data) {
      var error = error ? new Error('Failed to read memory: programmer return status was not OK.') : null;
      callback(error, data);
    });
  });
};

avrgirlStk500v2.prototype.readChipSignature = function (callback) {
  var self = this;
  var options = this.options.chip;
  var signature = options.signature;
  var set = 0;

  var cmd = new Buffer([
    C.CMD_READ_SIGNATURE_ISP,
    signature.startAddress,
    signature.read[0], signature.read[1],
    signature.read[2], signature.read[3]
  ]);

  var response = new Buffer(3);

  function getSigByte() {
    self.write(cmd, function (error) {
      if (error) { callback(error); }
      self.read(8, function(error, data) {
        if (error) { callback(error); }
        response[set] = data[2];
        set += 1;
        cmd[4] = set;
        if (set < 3) {
          getSigByte();
        } else {
          callback(null, response);
        }
      });
    });
  };

  getSigByte();

};

avrgirlStk500v2.prototype.cmdSpiMulti = function (options, callback) {
  // // P02
  //options are [cmd, numTx, numRx, rxStartAddr, txData]
};

avrgirlStk500v2.prototype.readFuses = function (callback) {
  var self = this;
  var options = this.options.chip;
  var set = 0;
  var reads = ['low', 'high', 'ext'];

  var cmd = new Buffer([
    C.CMD_READ_FUSE_ISP,
    options.fuses.startAddress
  ]);

  var cmdf = Buffer.concat([cmd, new Buffer(options.fuses.read[reads[0]])], 6);
  var response = new Buffer(3);

  function getFuseByte() {
    self.write(cmdf, function (error) {
      if (error) { callback(error); }
      self.read(4, function(error, data) {
        if (error) { callback(error); }
        response[set] = data[2];
        set += 1;
        if (set < 3) {
          cmdf = Buffer.concat([cmd, new Buffer(options.fuses.read[reads[set]])], 6);
          getFuseByte();
        } else {
          callback(null, response);
        }
      });
    });
  };

  getFuseByte();

};

avrgirlStk500v2.prototype.setParameter = function (param, value, callback) {
  var cmd = new Buffer([
    C.CMD_SET_PARAMETER,
    param, value
  ]);

  this.sendCmd(cmd, function (error) {
    var error = error ? new Error('Failed to set parameter: programmer return status was not OK.') : null;
    callback(error);
  });
};

avrgirlStk500v2.prototype.getParameter = function (param, callback) {
  var self = this;
  var cmd = new Buffer([
    C.CMD_GET_PARAMETER,
    param
  ]);

  this.write(cmd, function (error) {
    var error = error ? new Error('Failed to get parameter: programmer return status was not OK.') : null;
    if (error) { return callback(error, null); }
    self.read(8, function(error, data) {
      var error = error ? new Error('Failed to get parameter: programmer return status was not OK.') : null;
      callback(error, data);
    });
  });
};

module.exports = avrgirlStk500v2;
