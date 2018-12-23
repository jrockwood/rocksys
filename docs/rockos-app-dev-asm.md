# RockOS Application Development Handbook (Assembly Version)

This handbook describes how to develop applications for the RockOS platform in
assembly language, using the RockAsm assembler.

## Basic Architecture

The first version of RockOS is simple in nature, but fairly limited. It runs in
16-bit real mode and limits itself to 64KB of memory so that it will fit
entirely in a single segment. That simplifies having to worry about segment
registers.

## Loading

When the OS loads your program, it will load into address `0x2000:8000`. It will
also set the necessary segment registers and set up the stack so that you don't
have to worry about it.

The OS will execute your program by using a `call` instruction to a near
absolute memory location (`0x2000:8000`), so in order quit your application and
return back to the OS, you use the `ret` instruction.

## System Calls

RockOS exposes the following functions for your programs to use. They are in the
same segment as the programs so they can simply use a `call` instruction with an
absolute address and not have to worry about the segment. Internally, it's
implemented as a table of `jmp` instructions to the start of each function. That
allows the kernel to change without requiring external programs to change.

### Calling Convention

The system calls use the 16-bit `cdecl` calling convention, which has the
following behavior:

- The caller is responsible to push arguments onto the stack in right-to-left
  order.
- The caller is responsible for cleaning up the stack after the call (popping
  the arguments).
- The following registers are volatile: `AX BX CX DX ST(0)-ST(7) ES`
- The following regsiters are non-volatile: `SI DI BP SP CS DS FS GS`
- Return values are stored in the `AX` register for 8-bit, 16-bit, or near
  pointer values.
- Return values are stored in the `AX:DX` pair for 32-bit or far pointer values.

For example, consider the following C code:

```c
int callee(int, int, int);

int caller(void)
{
  int ret;

  ret = callee(1, 2, 3);
  ret += 5;
  return ret;
}
```

It would produce the following assembly code:

```asm
caller:
  ; make new call frame
  push    bp
  mov     bp, sp
  ; push call arguments
  push    3
  push    2
  push    1
  ; call subroutine 'callee'
  call    callee
  ; remove arguments from frame
  add     sp, 6
  ; use subroutine result
  add     ax, 5
  ; restore old call frame
  pop     bp
  ; return
  ret
```

## API Reference

- **[Disk](#disk)**
  - `os_read_sectors`
  - `os_write_sectors`
- **[Screen](#screen)**
  - `os_print_char`
  - `os_print_hex_byte`
  - `os_print_hex_nibble`
  - `os_print_hex_word`
  - `os_print_int`
  - `os_print_line`
  - `os_print_memory`
  - `os_print_newline`
  - `os_print_registers`
  - `os_print_space`
  - `os_print_string`
- **[String](#string)**
  - `os_int_to_string`
  - `os_string_to_int`

### Disk

#### `os_read_sectors(sector_number, sector_count, *dest_address)`

> Reads the number of sectors from the floppy disk to the target address.

- **Address** - `0x21`
- **Returns**
  - `AH` - error code
  - `AL` - 1 if successful, 0 if error
- **Parameters**
  - `sector_number` - logical sector number to read (0-based)
  - `sector_count` - number of sectors to read
  - `*dest_address` - destination address

#### `os_write_sectors(sector_number, sector_count, *source_address)`

> Reads the number of sectors from the floppy disk to the target address.

- **Address** - `0x24`
- **Returns**
  - `AH` - error code
  - `AL` - 1 if successful, 0 if error
- **Parameters**
  - `sector_number` - logical sector number to write (0-based)
  - `sector_count` - number of sectors to write
  - `*source_address` - source address

---

### Screen

#### `os_print_char(char)`

> Prints a character to the console.

- **Address** - `0x0C`
- **Returns** - Nothing
- **Parameters**
  - `char` - character to print

#### `os_print_hex_byte(byte, should_print_prefix)`

> Prints the low byte in hexidecimal format, with an optional prefix.

- **Address** - `0x15`
- **Returns** - Nothing
- **Parameters**
  - `byte` - byte to print
  - `should_print_prefix` - non-zero if the '0x' prefix should be printed

#### `os_print_hex_nibble(nibble, should_print_prefix)`

> Prints the low nibble in hexidecimal format, with an optional prefix.

- **Address** - `0x12`
- **Returns** - Nothing
- **Parameters**
  - `nibble` - number to print
  - `should_print_prefix` - non-zero if the '0x' prefix should be printed

#### `os_print_hex_word(word, should_print_prefix)`

> Prints the word in hexidecimal format, with an optional prefix.

- **Address** - `0x18`
- **Returns** - Nothing
- **Parameters**
  - `word` - number to print
  - `should_print_prefix` - non-zero if the '0x' prefix should be printed

#### `os_print_int(number, format)`

> Prints an integer using a specified format.

- **Address** - `0x2d`
- **Returns** - Nothing
- **Parameters**
  - `number` - number to print
  - `format` - see the note below for formats

The format can be one of the following values:

- `'d'` - decimal number with no formatting
- `'g'` - decimal number with commas as thousands separators
- `'x'` - hexidecimal number with no prefix and lower-case letters
- `'X'` - hexidecimal number with no prefix and upper-case letters
- `'0x'` - hexidecimal number with prefix and lower-case letters
- `'0X'` - hexidecimal number with prefix and upper-case letters

#### `os_print_line(str)`

> Prints a null-terminated string to the screen followed by a new line sequence
> (carriage return/line feed combination, CR/LF).

- **Address** - `0x06`
- **Returns** - Nothing
- **Parameters**
  - `str` - address of string

#### `os_print_memory(*address, line_count)`

> Prints the contents of memory at the specified address. Useful for debugging.

- **Address** - `0x1E`
- **Returns** - Nothing
- **Parameters**
  - `*address` - the address of the memory to print
  - `line_count` - the number of lines of 8 bytes to print

#### `os_print_newline()`

> Prints a new line sequence (carriage return/line feed combination, CR/LF).

- **Address** - `0x09`
- **Returns** - Nothing
- **Parameters** - None

#### `os_print_registers()`

> Prints all of the general purpose register values. Useful for debugging.

- **Address** - `0x1B`
- **Returns** - Nothing
- **Parameters** - None

#### `os_print_space()`

> Prints a space character to the screen.

- **Address** - `0x0F`
- **Returns** - Nothing
- **Parameters** - None

#### `os_print_string(str)`

> Prints a null-terminated string to the screen.

- **Address** - `0x03`
- **Returns** - Nothing
- **Parameters**
  - `str` - address of string

---

### String

#### `os_int_to_string(number, format, *buffer)`

> Converts an integer to a string using a specified format.

#### Call Information

- **Address** - `0x27`
- **Returns**
  - `AX` - 1 if successful, 0 if the format is invalid.
- **Parameters**
  - `number` - number to convert
  - `format` - see the note below for formats
  - `*buffer` - memory address containing space for at least 7 characters

The format can be one of the following values:

- `'d'` - decimal number with no formatting
- `'g'` - decimal number with commas as thousands separators
- `'x'` - hexidecimal number with no prefix and lower-case letters
- `'X'` - hexidecimal number with no prefix and upper-case letters
- `'0x'` - hexidecimal number with prefix and lower-case letters
- `'0X'` - hexidecimal number with prefix and upper-case letters

#### `os_string_to_int(string, format)`

> Converts a string into an integer.

- **Address** - `0x2A`
- **Returns**
  - `AX` - the converted number
  - `DX` - 1 if successful, 0 if the format is invalid.
- **Parameters**
  - `string` - address of a null-terminated string to convert
  - `format` - see the note below for formats

The format can be one of the following values:

- `'d'` - decimal number with no formatting
- `'g'` - decimal number with commas as thousands separators
- `'x'` - hexidecimal number with no prefix and lower-case letters
- `'X'` - hexidecimal number with no prefix and upper-case letters
- `'0x'` - hexidecimal number with prefix and lower-case letters
- `'0X'` - hexidecimal number with prefix and upper-case letters

Parsing using a given format is done in a non-strict way. As such, the 'd' and
'g' format are treated the same and the 'x', 'X', '0x', and '0X' formats are
treated the same.

---
