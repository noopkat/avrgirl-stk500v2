// thanks @soldair <3
// STK message constants
module.exports.MESSAGE_START = 0x1B
module.exports.TOKEN         = 0x0E

// STK general command constants
module.exports.CMD_SIGN_ON               = 0x01
module.exports.CMD_SET_PARAMETER         = 0x02
module.exports.CMD_GET_PARAMETER         = 0x03
module.exports.CMD_SET_DEVICE_PARAMETERS = 0x04
module.exports.CMD_OSCCAL                = 0x05
module.exports.CMD_LOAD_ADDRESS          = 0x06
module.exports.CMD_FIRMWARE_UPGRADE      = 0x07

// STK ISP command constants
module.exports.CMD_ENTER_PROGMODE_ISP  = 0x10
module.exports.CMD_LEAVE_PROGMODE_ISP  = 0x11
module.exports.CMD_CHIP_ERASE_ISP      = 0x12
module.exports.CMD_PROGRAM_FLASH_ISP   = 0x13
module.exports.CMD_READ_FLASH_ISP      = 0x14
module.exports.CMD_PROGRAM_EEPROM_ISP  = 0x15
module.exports.CMD_READ_EEPROM_ISP     = 0x16
module.exports.CMD_PROGRAM_FUSE_ISP    = 0x17
module.exports.CMD_READ_FUSE_ISP       = 0x18
module.exports.CMD_PROGRAM_LOCK_ISP    = 0x19
module.exports.CMD_READ_LOCK_ISP       = 0x1A
module.exports.CMD_READ_SIGNATURE_ISP  = 0x1B
module.exports.CMD_READ_OSCCAL_ISP     = 0x1C
module.exports.CMD_SPI_MULTI           = 0x1D

// STK status constants
// Success
module.exports.STATUS_CMD_OK = 0x00
// Warnings
module.exports.STATUS_CMD_TOUT          = 0x80
module.exports.STATUS_RDY_BSY_TOUT      = 0x81
module.exports.STATUS_SET_PARAM_MISSING = 0x82
// Errors
module.exports.STATUS_CMD_FAILED  = 0xC0
module.exports.STATUS_CKSUM_ERROR = 0xC1
module.exports.STATUS_CMD_UNKNOWN = 0xC9

// STK parameter constants
module.exports.STATUS_BUILD_NUMBER_LOW  = 0x80
module.exports.STATUS_BUILD_NUMBER_HIGH = 0x81
module.exports.STATUS_HW_VER            = 0x90
module.exports.STATUS_SW_MAJOR          = 0x91
module.exports.STATUS_SW_MINOR          = 0x92
module.exports.STATUS_VTARGET           = 0x94
module.exports.STATUS_VADJUST           = 0x95
module.exports.STATUS_OSC_PSCALE        = 0x96
module.exports.STATUS_OSC_CMATCH        = 0x97
module.exports.STATUS_SCK_DURATION      = 0x98
module.exports.STATUS_TOPCARD_DETECT    = 0x9A
module.exports.STATUS_STATUS            = 0x9C
module.exports.STATUS_DATA              = 0x9D
module.exports.STATUS_RESET_POLARITY    = 0x9E
module.exports.STATUS_CONTROLLER_INIT   = 0x9F

// STK answer constants
module.exports.ANSWER_CKSUM_ERROR = 0xB0
