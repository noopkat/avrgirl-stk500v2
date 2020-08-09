var C = require('./lib/c');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var fs = require('fs');
var async = require('async');
var libusb = require('./lib/libusb-comms');
var serialcom = require('./lib/serialport-comms');
var intelhex = require('intel-hex');
const { callbackify, promisify } = require('util');

function avrgirlStk500v2(options) {
  this.options = {
    comm: options.comm || null,
    chip: options.chip || null,
    debug: options.debug || false,
    frameless: options.frameless || false
  };

  this.device;
  this.seq = 0;
  this.debug = this.options.debug ? console.log : function() {};

  if (this.options.comm.path) {
    this.debug('serialport!');
    this.commType = 'serialcom';
    this.device = new serialcom(this.options.comm);
  } else {
    this.debug('libusb!');
    this.commType = 'libusb';
    this.device = new libusb(this.options.comm);
  }

  EventEmitter.call(this);
  this._setupComms();
};

util.inherits(avrgirlStk500v2, EventEmitter);

avrgirlStk500v2.prototype._setupComms = function() {
  this.debug('setting up communication interface');
  var self = this;
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
  var head = Buffer.from([0x1B, this.seq, lMSB, lLSB, C.TOKEN]);
  var headed = Buffer.concat([head, buffer]);

  var checksum = 0;
  for (var i = 0; i < headed.length; i += 1) {
    checksum ^= headed[i];
  }

  this.seq += 1;

  var framed = Buffer.concat([headed, Buffer.from([checksum])]);
  return framed;
};

avrgirlStk500v2.prototype.writeAsync = async function (buffer) {
  if (!Buffer.isBuffer(buffer)) {
    if (!Array.isArray(buffer)) {
      throw new Error('Failed to write: data was not Buffer or Array object.');
    }
    var buffer = Buffer.from(buffer);
  }

  var data = (this.options.frameless) ? buffer : this.frame(buffer);

  this.debug('writing', data);

  await this.device.writeAsync(data);
};

avrgirlStk500v2.prototype.write = callbackify(avrgirlStk500v2.prototype.writeAsync);

avrgirlStk500v2.prototype.readAsync = async function (length) {
  if (typeof length !== 'number') { throw new Error('Failed to read: length must be a number.'); }
  var data = await this.device.readAsync(length);
  //var buffer = (self.options.frameless) ? data : data.slice(6);
  var buffer = data || [];
  this.debug('read', buffer);
  return buffer;
};

avrgirlStk500v2.prototype.read = callbackify(avrgirlStk500v2.prototype.readAsync);

avrgirlStk500v2.prototype.sendCmdAsync = async function(cmd) {
  var frameless = this.options.frameless;
  var readLen = frameless ? 2 : 8;
  var statusPos = frameless ? 1 : 6;

  await this.writeAsync(cmd);
  var data = await this.readAsync(readLen);
  if (data && data.length > 0 && data[statusPos] !== C.STATUS_CMD_OK) {
    throw new Error('Return status was not OK. Received instead: ' + data.toString('hex'));
  }
};

avrgirlStk500v2.prototype.sendCmd = callbackify(avrgirlStk500v2.prototype.sendCmdAsync);

avrgirlStk500v2.prototype.getSignatureAsync = async function () {
  var cmd = Buffer.from([C.CMD_SIGN_ON]);
  var frameless = this.options.frameless;
  var readLen = frameless ? 3 : 9;
  var statusPos = frameless ? 1 : 6;
  var sigPos = frameless ? 3 : 8;
  var foot = frameless ? 0 : 1;

  await this.writeAsync(cmd);
  var data = await this.readAsync(20 + readLen);
  if (data[statusPos] !== C.STATUS_CMD_OK) {
    throw new Error('Failed to verify: programmer return status was not OK.');
  }
  var signature = data.slice(sigPos, data.length - foot);
  return signature;
};

avrgirlStk500v2.prototype.getSignature = callbackify(avrgirlStk500v2.prototype.getSignatureAsync);

avrgirlStk500v2.prototype.verifySignatureAsync = async function (sig, data) {
  if (!sig.equals(data)) {
    throw new Error('Failed to verify: signature does not match.');
  }
};

avrgirlStk500v2.prototype.verifySignature = callbackify(avrgirlStk500v2.prototype.verifySignatureAsync);

avrgirlStk500v2.prototype.loadAddressAsync = async function (memType, address) {
  var dMSB = memType === 'flash' ? 0x80 : 0x00;
  var msb = (address >> 24) & 0xFF | dMSB;
  var xsb = (address >> 16) & 0xFF;
  var ysb = (address >> 8) & 0xFF;
  var lsb = address & 0xFF;

  var cmd = Buffer.from([C.CMD_LOAD_ADDRESS, msb, xsb, ysb, lsb]);

  try {
    await this.sendCmdAsync(cmd);
  } catch (error) {
    throw new Error('Failed to load address: return status was not OK.');
  }
};

avrgirlStk500v2.prototype.loadAddress = callbackify(avrgirlStk500v2.prototype.loadAddressAsync);

avrgirlStk500v2.prototype.loadPageAsync = async function (memType, data) {
  if (!Buffer.isBuffer(data)) {
    throw new Error('Failed to write page: data was not Buffer');
  }

  var lMSB = data.length >> 8;
  var lLSB = data.length & 0xFF;
  var mem = this.options.chip[memType];
  var cmd = memType === 'flash' ? C.CMD_PROGRAM_FLASH_ISP : C.CMD_PROGRAM_EEPROM_ISP

  var cmd = Buffer.from([
    cmd,
    lMSB, lLSB,
    0xC1, mem.delay,
    mem.write[0], mem.write[1], mem.write[2],
    mem.poll1, mem.poll2
  ]);

  cmd = Buffer.concat([cmd, data]);

  await this.sendCmdAsync(cmd);
};

avrgirlStk500v2.prototype.loadPage = callbackify(avrgirlStk500v2.prototype.loadPageAsync);

avrgirlStk500v2.prototype.writeMemAsync = async function (memType, hex) {
  var options = this.options.chip;
  var pageAddress = 0;
  var useAddress;
  var pageSize = options[memType].pageSize;
  var addressOffset = options[memType].addressOffset;
  var data;
  var readFile;

  if (typeof hex === 'string') {
    try {
      readFile = fs.readFileSync(hex, { encoding: 'utf8' });
    } catch (e) {
      if (e.code === 'ENOENT') {
        throw new Error('could not write ' + memType + ': please supply a valid path to a hex file.');
      } else {
        throw e;
      }
    }

    hex = intelhex.parse(readFile).data;

  } else if (!Buffer.isBuffer(hex)) {
    throw new Error('could not write ' + memType + ': please supply either a hex buffer or a valid path to a hex file.');
  }

  function testEndOfFile() {
    // case for data being flashed being less than one page in size
    if (pageAddress === 0 && hex.length < pageSize) {
      return false;
    }
    return pageAddress < hex.length;
  }

  while (testEndOfFile()) {
    // load address
    useAddress = pageAddress >> addressOffset;
    await this.loadAddressAsync(memType, useAddress);
    // write to page
    data = hex.slice(pageAddress, (hex.length > pageSize ? (pageAddress + pageSize) : hex.length - 1))
    await this.loadPageAsync(memType, data);
    // calc next page
    pageAddress = pageAddress + data.length;
  }
};

avrgirlStk500v2.prototype.writeMem = callbackify(avrgirlStk500v2.prototype.writeMemAsync);

avrgirlStk500v2.prototype.enterProgrammingModeAsync = async function () {
  var options = this.options.chip;
  var enable = options.pgmEnable;

  var cmd = Buffer.from([
    C.CMD_ENTER_PROGMODE_ISP,
    options.timeout, options.stabDelay,
    options.cmdexeDelay, options.syncLoops,
    options.byteDelay,
    options.pollValue, options.pollIndex,
    enable[0], enable[1],
    enable[2], enable[3]
  ]);

  try {
    await this.sendCmdAsync(cmd);
  } catch (error) {
    //var error = new Error('Failed to enter prog mode: programmer return status was not OK.');
    var error = new Error(error);
    throw error;
  }
};

avrgirlStk500v2.prototype.enterProgrammingMode = callbackify(avrgirlStk500v2.prototype.enterProgrammingModeAsync);

avrgirlStk500v2.prototype.exitProgrammingModeAsync = async function () {
  var options = this.options.chip;

  var cmd = Buffer.from([
    C.CMD_LEAVE_PROGMODE_ISP, options.preDelay, options.postDelay
  ]);

  try {
    await this.sendCmdAsync(cmd);
  } catch (error) {
    throw new Error('Failed to leave prog mode: programmer return status was not OK.');
  }
};

avrgirlStk500v2.prototype.exitProgrammingMode = callbackify(avrgirlStk500v2.prototype.exitProgrammingModeAsync);

avrgirlStk500v2.prototype.eraseChipAsync = async function () {
  var options = this.options.chip;
  var erase = options.erase;

  var cmd = Buffer.from([
    C.CMD_CHIP_ERASE_ISP,
    erase.delay, options.pollMethod,
    erase.cmd[0], erase.cmd[1],
    erase.cmd[2], erase.cmd[3]
  ]);

  try {
    await this.sendCmdAsync(cmd);
  } catch {
    throw new Error('Failed to erase chip: programmer return status was not OK.');
  }
};

avrgirlStk500v2.prototype.eraseChip = callbackify(avrgirlStk500v2.prototype.eraseChipAsync);

avrgirlStk500v2.prototype.writeFlashAsync = async function (hex) {
  // optional convenience method
  await this.writeMemAsync('flash', hex);
};

avrgirlStk500v2.prototype.writeFlash = callbackify(avrgirlStk500v2.prototype.writeFlashAsync);

avrgirlStk500v2.prototype.writeEepromAsync = async function (hex) {
  // optional convenience method
  await this.writeMemAsync('eeprom', hex);
};

avrgirlStk500v2.prototype.writeEeprom = callbackify(avrgirlStk500v2.prototype.writeEepromAsync);

avrgirlStk500v2.prototype.quickFlashAsync = async function (hex) {
  await this.enterProgrammingModeAsync();
  await this.writeFlashAsync(hex);
  await this.exitProgrammingModeAsync();
};

avrgirlStk500v2.prototype.quickFlash = callbackify(avrgirlStk500v2.prototype.quickFlashAsync);

avrgirlStk500v2.prototype.quickEepromAsync = async function (hex, callback) {
  await this.enterProgrammingModeAsync();
  await this.writeEepromAsync(hex);
  await this.exitProgrammingModeAsync();
};

avrgirlStk500v2.prototype.quickEeprom = callbackify(avrgirlStk500v2.prototype.quickEepromAsync);

avrgirlStk500v2.prototype.readFlashAsync = async function (length) {
  // optional convenience method
  var data = await this.readMemAsync('flash', length);
  return data;
};

avrgirlStk500v2.prototype.readFlash = callbackify(avrgirlStk500v2.prototype.readFlashAsync);

avrgirlStk500v2.prototype.readEepromAsync = async function (length, callback) {
  // optional convenience method
  var data = await this.readMemAsync('eeprom', length);
  return data;
};

avrgirlStk500v2.prototype.readEeprom = callbackify(avrgirlStk500v2.prototype.readEepromAsync);

avrgirlStk500v2.prototype.readMemAsync = async function (memType, length) {
  var options = this.options.chip;
  var headLen = this.options.frameless ? 3 : 6;
  var cmd = memType === 'flash' ? C.CMD_READ_FLASH_ISP : C.CMD_READ_EEPROM_ISP
  var buf = Buffer.from([
    cmd,
    length >> 8, length,
    options[memType].read[0]
  ]);

  try {
    await this.writeAsync(buf);
  } catch (error) {
    throw new Error('Failed to initiate read memory: programmer return status was not OK.');
  }

  try {
    var data = this.readAsync(length + headLen);
    return data;
  } catch {
    throw new Error('Failed to read memory: programmer return status was not OK.');
  }
};

avrgirlStk500v2.prototype.readMem = callbackify(avrgirlStk500v2.prototype.readMemAsync);

avrgirlStk500v2.prototype.getChipSignatureAsync = async function () {
  var options = this.options.chip;
  var signature = options.signature;
  var signatureLength = signature.size;
  var frameless = this.options.frameless;
  var readLen = frameless ? 4 : 10;
  var statusPos = frameless ? 1 : 6;
  var sigPos = frameless ? 2 : 7;
  var set = 0;

  var cmd = Buffer.from([
    C.CMD_READ_SIGNATURE_ISP,
    signature.startAddress,
    signature.read[0], signature.read[1],
    signature.read[2], signature.read[3]
  ]);

  var response = Buffer.alloc(3);

  while (set < signatureLength) {
    await this.writeAsync(cmd);
    var data = await this.readAsync(readLen);
    response[set] = data[sigPos];
    set += 1;
    cmd[4] = set;
  }

  return response;
};

avrgirlStk500v2.prototype.getChipSignature = callbackify(avrgirlStk500v2.prototype.getChipSignatureAsync);

avrgirlStk500v2.prototype.cmdSpiMulti = function (options, callback) {
  // // P02
  //options are [cmd, numTx, numRx, rxStartAddr, txData]
};

avrgirlStk500v2.prototype.readFusesAsync = async function () {
  var chip = this.options.chip;
  var fuses = chip.fuses;
  var reads = Object.keys(fuses.read);
  var fusePos = (this.options.frameless) ? 2 : 7;
  var response = {};

  for (let item of reads) {
    response[item] = await this.readFuseAsync(item);
  }

  return response;
};

avrgirlStk500v2.prototype.readFuses = callbackify(avrgirlStk500v2.prototype.readFusesAsync);

avrgirlStk500v2.prototype.readFuseAsync = async function (fuseType) {
  if ((typeof fuseType).toLowerCase() !== 'string') {
    throw new Error('Failed to read fuse: fuse type should be a string');
  }

  var chip = this.options.chip;
  var fuse = chip.fuses.read[fuseType];
  var readLen = (this.options.frameless) ? 4 : 10;
  var fusePos = (this.options.frameless) ? 2 : 7;

  var cmd = Buffer.from([
    C.CMD_READ_FUSE_ISP,
    chip.fuses.startAddress
  ]);

  var cmdf = Buffer.concat([cmd, Buffer.from(fuse)], cmd.length + fuse.length);

  await this.writeAsync(cmdf);
  var data = this.readAsync(readLen);
  var response = Buffer.from([data[fusePos]]);
  return response;
};

avrgirlStk500v2.prototype.readFuse = callbackify(avrgirlStk500v2.prototype.readFuseAsync);

avrgirlStk500v2.prototype.writeFuse = function (fuseType, value, callback) {
  var self = this;
  var options = this.options.chip;
  var frameless = this.options.frameless;
  var readLen = frameless ? 3 : 9;
  var statusPos = frameless ? 1 : 6;
  var fuseCmd = options.fuses.write[fuseType];

  var cmd = Buffer.from([
    C.CMD_PROGRAM_FUSE_ISP,
    fuseCmd[0], fuseCmd[1],
    fuseCmd[2], value
  ]);

  this.write(cmd, function (error) {
    if (error) { callback(error); }
    self.read(readLen, function (error, data) {
      if (data[statusPos] !== C.STATUS_CMD_OK) {
        error = new Error('Failed to program fuse: programmer return status was not OK.');
      }
      callback(null);
    });
  });
};

avrgirlStk500v2.prototype.writeFuseAsync = promisify(avrgirlStk500v2.prototype.writeFuse);

avrgirlStk500v2.prototype.setParameter = function (param, value, callback) {
  var cmd = Buffer.from([
    C.CMD_SET_PARAMETER,
    param, value
  ]);

  this.sendCmd(cmd, function (error) {
    var error = error ? new Error('Failed to set parameter: programmer return status was not OK.') : null;
    callback(error);
  });
};

avrgirlStk500v2.prototype.setParameterAsync = promisify(avrgirlStk500v2.prototype.setParameter);

avrgirlStk500v2.prototype.getParameter = function (param, callback) {
  var self = this;
  var cmd = Buffer.from([
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

avrgirlStk500v2.prototype.getParameterAsync = promisify(avrgirlStk500v2.prototype.getParameter);

module.exports = avrgirlStk500v2;
