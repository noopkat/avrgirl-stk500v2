// thanks @soldair <3
const constants = {};
// STK message constants
constants.MESSAGE_START = 0x1B
constants.TOKEN         = 0x0E

// STK general command constants
constants.CMD_SIGN_ON               = 0x01
constants.CMD_SET_PARAMETER         = 0x02
constants.CMD_GET_PARAMETER         = 0x03
constants.CMD_SET_DEVICE_PARAMETERS = 0x04
constants.CMD_OSCCAL                = 0x05
constants.CMD_LOAD_ADDRESS          = 0x06
constants.CMD_FIRMWARE_UPGRADE      = 0x07

// STK ISP command constants
constants.CMD_ENTER_PROGMODE_ISP  = 0x10
constants.CMD_LEAVE_PROGMODE_ISP  = 0x11
constants.CMD_CHIP_ERASE_ISP      = 0x12
constants.CMD_PROGRAM_FLASH_ISP   = 0x13
constants.CMD_READ_FLASH_ISP      = 0x14
constants.CMD_PROGRAM_EEPROM_ISP  = 0x15
constants.CMD_READ_EEPROM_ISP     = 0x16
constants.CMD_PROGRAM_FUSE_ISP    = 0x17
constants.CMD_READ_FUSE_ISP       = 0x18
constants.CMD_PROGRAM_LOCK_ISP    = 0x19
constants.CMD_READ_LOCK_ISP       = 0x1A
constants.CMD_READ_SIGNATURE_ISP  = 0x1B
constants.CMD_READ_OSCCAL_ISP     = 0x1C
constants.CMD_SPI_MULTI           = 0x1D

// STK status constants
// Success
constants.STATUS_CMD_OK = 0x00
// Warnings
constants.STATUS_CMD_TOUT          = 0x80
constants.STATUS_RDY_BSY_TOUT      = 0x81
constants.STATUS_SET_PARAM_MISSING = 0x82
// Errors
constants.STATUS_CMD_FAILED  = 0xC0
constants.STATUS_CKSUM_ERROR = 0xC1
constants.STATUS_CMD_UNKNOWN = 0xC9

// STK parameter constants
constants.STATUS_BUILD_NUMBER_LOW  = 0x80
constants.STATUS_BUILD_NUMBER_HIGH = 0x81
constants.STATUS_HW_VER            = 0x90
constants.STATUS_SW_MAJOR          = 0x91
constants.STATUS_SW_MINOR          = 0x92
constants.STATUS_VTARGET           = 0x94
constants.STATUS_VADJUST           = 0x95
constants.STATUS_OSC_PSCALE        = 0x96
constants.STATUS_OSC_CMATCH        = 0x97
constants.STATUS_SCK_DURATION      = 0x98
constants.STATUS_TOPCARD_DETECT    = 0x9A
constants.STATUS_STATUS            = 0x9C
constants.STATUS_DATA              = 0x9D
constants.STATUS_RESET_POLARITY    = 0x9E
constants.STATUS_CONTROLLER_INIT   = 0x9F

// STK answer constants
constants.ANSWER_CKSUM_ERROR = 0xB0

constants.SEQ_SIGN_ON = [0x1b, 0x03, 0x00, 0x0b, 0x0e, 0x01, 0x00, 0x08, 0x41, 0x56, 0x52, 0x49, 0x53, 0x50, 0x5f, 0x32, 0x76]; 

module.exports = constants;
