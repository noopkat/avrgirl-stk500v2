[![Build Status](https://travis-ci.org/noopkat/avrgirl-stk500v2.svg?branch=master)](https://travis-ci.org/noopkat/avrgirl-stk500v2) [![Coverage Status](https://coveralls.io/repos/noopkat/avrgirl-stk500v2/badge.svg?branch=master&service=github)](https://coveralls.io/github/noopkat/avrgirl-stk500v2?branch=master) 

# avrgirl-stk500v2


avrgirl flavoured stk500v2 protocol communication for compatible programming devices.

![avrgirl logo](http://i.imgur.com/hFXbPIe.png)

## Installation

`npm install avrgirl-stk500v2`

## What is this?

avrgirl-stk500v2 is a NodeJS implementation of the stk500v2 protocol. It facilitates the 2-way communication required to program and read supported Atmel AVR microchips and programmers alike.

Current feature implementation of avrgirl-stk500v2:

+ Enter / leave programming mode
+ Read programmer/chip signatures
+ Write to EEPROM and Flash memory
+ Read from EEPROM and Flash memory
+ Erase chip memory
+ Read and write fuses
+ Get and set parameters
+ Support for both **libusb** and **serialport** connections

## What would I use this for?

Let's say you'd like to use NodeJS to flash and erase microchips. This could be an Arduino Mega, or an integrated circuit with an embedded AVR microchip. For example, you could flash a precompiled program to the following setup with an STK500v2 compatible programmer, such as an AVRISP mkII:

![barebones](http://i.imgur.com/KhjCxr5.jpg)

## Before you start

### Establishing a USB connection

Your approach here will vary with what you're connecting to. The two NodeJS USB packages that this library supports are [usb](https://www.npmjs.com/package/usb) and [serialport](https://www.npmjs.com/package/serialport). Choose the one that will work with your STK500v2 device.

### Providing options

avrgirl-stk500v2 needs some input from you when instantiating. This is because we don't know which chip you would like to flash yet, which usb method you're using, or which variety of STK500v2 you require (framed or frameless).

The options needed have the following signature:

```javascript
var options = {
  comm: [Object],
  chip: [Object],
  frameless: [Boolean],
  debug: [Boolean]
};
```

Confused? Let's have a look at each one.

**options.comm**

This is the communication method required. Pass in an established instance of either [serialport](https://www.npmjs.com/package/serialport) or [usb](https://www.npmjs.com/package/usb). See the examples in [how to use](#how-to-use).

**options.chip**

The chip property is an object that follows a strict format / signature. It specifies the configuration properties of the microchip you are using.  You'll need to know and supply this configuration. You can find this from AVR Studio, the [avrgirl-chips-json package](https://www.npmjs.com/package/avrgirl-chips-json), or use the [AVRDUDE conf API](avrdude-conf.herokuapp.com). Pull requests to the [avrgirl-chips-json repo](https://github.com/noopkat/avrgirl-chips-json) with additional chips is most welcome.

Here is the signature, provided as an example of the ATtiny85:

```javascript
{
  "name": "ATtiny85",
  "timeout": 200,
  "stabDelay": 100,
  "cmdexeDelay": 25,
  "syncLoops": 32,
  "byteDelay": 0,
  "pollIndex": 3,
  "pollValue": 83,
  "preDelay": 1,
  "postDelay": 1,
  "pgmEnable": [172, 83, 0, 0],
  "erase": {
    "cmd": [172, 128, 0, 0],
    "delay": 45,
    "pollMethod": 1
  },
  "flash": {
    "write": [64, 76, 0],
    "read": [32, 0, 0],
    "mode": 65,
    "blockSize": 64,
    "delay": 10,
    "poll2": 255,
    "poll1": 255,
    "size": 8192,
    "pageSize": 64,
    "pages": 128,
    "addressOffset": 0
  },
  "eeprom": {
    "write": [193, 194, 0],
    "read": [160, 0, 0],
    "mode": 65,
    "blockSize": 4,
    "delay": 5,
    "poll2": 255,
    "poll1": 255,
    "size": 512,
    "pageSize": 4,
    "pages": 128,
    "addressOffset": 0
  },
  "sig": [30, 147, 11],
  "signature": {
    "size": 3,
    "startAddress": 0,
    "read": [48, 0, 0, 0]
  },
  "fuses": {
    "startAddress": 0,
    "write": {
      "low": [172, 160, 0, 0],
      "high": [172, 168, 0, 0],
      "ext": [172, 164, 0, 0]
    },
    "read": {
      "low": [80, 0, 0, 0],
      "high": [88, 8, 0, 0],
      "ext": [80, 8, 0, 0]
    }
  }
}
```

**options.frameless**

Defaults to `false` if this property is not specified.  
Some STK500v2 devices use frameless messaging mode, and some use framed. What is the difference? See below:

| Framed Format
| --------------
| MESSAGE START
| SEQUENCE NUMBER
| MESSAGE LENGTH
| TOKEN
| MESSAGE BODY
| CHECKSUM

or

| Frameless Format
| --------------
| MESSAGE BODY

Read the manual for the device being used in order to find which messaging mode is needed.

**options.debug**

Defaults to `false` if this property is not specified.  
Logs activity information to the console while performing methods.

## How to use

### Example using serialport:

```javascript
var stk500v2 = require('avrgirl-stk500v2');
var serialport = require('serialport');
var SerialPort = serialport.SerialPort;

var sp = new SerialPort('/dev/cu.usbmodem1411', {
  baudrate: 115200,
  parser: serialport.parsers.raw
}, false);

var mega = {
  // all chip properties
};

var options = {
  comm: sp,
  chip: mega,
  frameless: false
}

var stk = new stk500v2(options);

stk.on('ready', function() {
  // do cool chip stuff in here
});
```

### Example using usb:

```javascript
var stk500v2 = require('avrgirl-stk500v2');
var usb = require('usb');

var attiny45 = {
  // all chip properties
};

var programmer = usb.findByIds(0x03eb, 0x2104);

var options = {
  comm: programmer,
  chip: attiny45,
  frameless: true
}

var stk = new stk500v2(options);

stk.on('ready', function() {
	// do cool chip stuff in here
});
```

## Available methods


### getChipSignature

Gets the signature of the microchip. 

Returns a buffer containing the signature bytes.

Usage:

```javascript
stk.getChipSignature(function(error, signature) {
  console.log(signature);
});
```

### getSignature

Gets the signature of the STK500V2 device, but not necessarily the microchip's signature. This is normally the signature of middleperson STK500v2 programmer if you're using one. To get the microchip's signature, use the `getChipSignature` method instead.

Returns a buffer containing the signature bytes.

Usage:

```javascript
stk.getSignature(function(error, signature) {
  console.log(signature);
});
```

### enterProgrammingMode

Enables programming mode on the microchip.

Returns a null error upon callback if successful.

```javascript
stk.enterProgrammingMode(function(error) {
  console.log(error);
});
```

### exitProgrammingMode

Leaves programming mode on the microchip. Returns a null error upon callback if successful.

```javascript
stk.exitProgrammingMode(function(error) {
  console.log(error);
});
```

### eraseChip

Erases both the flash and EEPROM memories on the microchip. Good practice to do before flashing any new data.

💣💣💣  Literally erases **everything** please be careful 💣💣💣  

Returns a null error upon callback if successful.

```javascript
stk.eraseChip(function(error) {
  console.log(error);
});
```

### getParameter

Gets the value of a specified parameter. Pass in the parameter's byte label and a callback respectively.

Returns a null error and the parameter value upon callback if successful.

```javascript
stk.getParameter(0x94, function(error, data) {
  console.log(error, data);
});
```

### setParameter

Sets the value of a specified parameter. Pass in the parameter's byte label, the requested value, and a callback respectively.

Returns a null error upon callback if successful.

```javascript
stk.setParameter(0x94, 0x00, function(error) {
  console.log(error);
});
```


### writeFlash

Writes a buffer to the flash memory of the microchip. Provide a filepath string, and a callback, respectively. Alternatively, you may also provide a pre-parsed Buffer in in place of the filepath.

Returns a null error upon callback if successful.

```javascript
stk.writeFlash('Blink.cpp.hex', function(error) {
  console.log(error);
});
```

### writeEeprom

Writes a buffer to the eeprom memory of the microchip. Provide a filepath string, and a callback, respectively. Alternatively, you may also provide a pre-parsed Buffer in in place of the filepath.

Returns a null error upon callback if successful.

```javascript

stk.writeEeprom('myEeprom.cpp.hex', function(error) {
  console.log(error);
});
```

### readFlash

Reads a specified length of flash memory from the microchip. Takes a length integer (or hex) for the number of bytes to read, and a callback as the arguments, respectively. 

Returns a null error and a buffer of the read bytes upon callback if successful.

Usage:

```javascript
stk.readFlash(64, function(error, data) {
  console.log(data);
});
```

### readEeprom

Reads a specified length of flash memory from the microchip. Takes a length integer (or hex) for the number of bytes to read, and a callback as the arguments, respectively. 

Returns a null error and a buffer of the read bytes upon callback if successful.

Usage:

```javascript
stk.readFlash(64, function(error, data) {
  console.log(error, data);
});
```

### readFuses

Reads all of the available fuse values on the microchip.

Returns a null error and an object containing the fuse key and byte value pairs upon callback if successful.

Usage:

```javascript
stk.readFuses(function(error, data) {
  console.log(error, data);
});
```

### readFuse

Reads a specific fuse on the microchip. Pass in a string of the right fuse key from the chip properties.

Returns a null error and a buffer containing the fuse byte value upon callback if successful.

Usage:

```javascript
stk.readFuse('low', function(error, data) {
  console.log(error, data);
});
```

### writeFuse

💣💣💣 ***OMG, please be careful with this.*** 💣💣💣  
please please please.

You can brick your chip if you do not know exactly what you're doing. Use an online fuse calculator first, and triple check before running this method. 

I accept no responsibility for bricked chips 💀😱😭

Takes a fuse key string, a value to set it to, and a callback.

Usage:

```javascript
// ********* 
// please do not run this code unless you're sure that 0x62 is a good idea for your chip ;___;
// *********
stk.writeFuse('low', 0x62, function(error) {
  // note: a null error doesn't necessarily mean you didn't do something foolish here.
  console.log(error);
});
```
---  

## Other methods

**NOTE:** The following methods below are rarely needed, but documented in case you have need for them.

### open

Void. Upon instantiation, avrgirl-stk500v2 opens a connection to the device. You shouldn't need to call this method unless you've previously closed the connection manually.

Usage:

```javascript
stk.open();
```


### close

Void. Closes the connection to the STK500V2 device.

Usage:

```javascript
stk.close();
```


### write

Writes a buffer of data to the STK500V2 device. Takes a buffer and a callback as the arguments, respectively.

Usage:

```javascript
var buffer = new Buffer([0x01, 0x00, 0x00]);

stk.write(buffer, function(error) {
  console.log('written.');
});
```

### read

Reads the last response from the STK500V2 device. Takes a length integer (number of bytes to read), and a callback as the arguments, respectively. Generally you'll want to call this immediately after a write.

Usage:

```javascript
var buffer = new Buffer([0x01, 0x00, 0x00]);

stk.write(buffer, function(error) {
  stk.read(2, function(error, data) {
	console.log(data);
  });
});
```

### sendCmd

SendCmd is a shortcut to sending an instruction buffer, of which you're simply expecting an 'OK' back. Your instruction will be sent, and the callback will return a null error if an 'OK' response returned.

In frameless mode, the expected response needs to be 2 bytes, and in framed it should be 8. Not compatible with instructions that aren't simply a simple command for the device. Use write, or the matched method for what you're wanting to achieve.

Returns a null error if successful.

```javascript
var buffer = new Buffer([0x01, 0x00, 0x00]);

stk.sendCmd(buffer, function(error) {
  console.log(error);
});
```
