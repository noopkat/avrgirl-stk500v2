[![Build Status](https://travis-ci.org/noopkat/avrgirl-stk500v2.svg?branch=master)](https://travis-ci.org/noopkat/avrgirl-stk500v2) [![Coverage Status](https://coveralls.io/repos/noopkat/avrgirl-stk500v2/badge.svg?branch=master&service=github)](https://coveralls.io/github/noopkat/avrgirl-stk500v2?branch=master) 

# avrgirl-stk500v2


avrgirl flavoured stk500v2 protocol communication for compatible programming devices.

![avrgirl logo](http://i.imgur.com/hFXbPIe.png)

## Installation

`npm install avrgirl-stk500v2`

## What is this?

avrgirl-stk500v2 is a NodeJS implementation of the stk500v2 protocol. It facilitates the 2-way communication required to program and read supported Atmel AVR microchips and programmers alike.

Current feature implementation of avrgirl-stk500v2 :

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

This is the communication method required. Pass in an established instance of either serialport or usb. See the examples in [how to use]().

**options.chip**

The chip property is an object that follows a strict format / signature. It specifies the configuration properties of the microchip you are using.  You'll need to know and supply this configuration. You can find this from AVR Studio, the [avrgirl-chips-json repo](https://github.com/noopkat/avrgirl-chips-json), or use the [AVRDUDE conf API](avrdude-conf.herokuapp.com). Pull requests to the [avrgirl-chips-json repo](https://github.com/noopkat/avrgirl-chips-json) with additional chips is most welcome.

Here is the signature, provided as an example of the ATtiny45:

```javascript
var attiny45 = {
  sig: [0x1E, 0x92, 0x06],
  timeout: 0xC8,
  stabDelay: 0x64,
  cmdexeDelay: 0x19,
  syncLoops: 0x20,
  byteDelay: 0x00,
  pollIndex: 0x03,
  pollValue: 0x53,
  preDelay: 0x01,
  postDelay: 0x01,
  pollMethod: 0x01,
  poll1: 0x00,
  poll2: 0x00,
  pgmEnable: [0xAC, 0x53, 0x00, 0x00],
  flash: {
    paged: true,
    mode: 0xC1,
    delay: 6,
    size: 4096,
    pageSize: 64,
    pages: 64,
    addressOffset: 1,
    write: [0x40, 0x4C, 0x20],
    read: [0x20, 0x00, 0x00],
    poll1: 0xFF,
    poll2: 0xFF
  },
  eeprom: {
    paged: true,
    mode: 0xC1,
    delay: 6,
    size: 256,
    pageSize: 4,
    pages: 64,
    addressOffset: 0,
    write: [0xC1, 0xC2, 0xA0],
    read: [0xA0, 0x00, 0x00],
    poll1: 0xFF,
    poll2: 0xFF
  },
  erase: {
    delay: 10,
    cmd: [0xAC, 0x80, 0x00, 0x00]
  },
  signature: {
    size: 3,
    startAddress: 0x00,
    read: [0x30, 0x00, 0x00, 0x00]
  },
  fuses: {
    startAddress: 0x00,
    write: {
      low: [0xAC, 0xA0, 0x00, 0x62],
      high: [0xAC, 0xA8, 0x00, 0xDF],
      ext: [0xAC, 0xA4, 0x00, 0xFF]
    },
    read: {
      low: [0x50, 0x00, 0x00, 0x00],
      high: [0x58, 0x08, 0x00, 0x00],
      ext: [0x50, 0x08, 0x00, 0x00]
    }
  }
};
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

var sp = new SerialPort('/dev/cu.usbmodem1411', {
  baudrate: 115200,
  parser: serialport.parsers.raw
}, false);

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

TODO - write up examples for each.

'open',
'close',
'write',
'read',
'sendCmd',
'getSignature',
'verifySignature',
'loadAddress',
'loadPage',
'writeMem',
'readMem',
'enterProgrammingMode',
'exitProgrammingMode',
'eraseChip',
'writeFlash',
'writeEeprom',
'readFlash',
'readEeprom',
'getChipSignature',
'readFuses',
'readFuse',
'writeFuse',
'cmdSpiMulti',
'setParameter',
'getParameter'