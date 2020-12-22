# RockAsm - Rockwood Assembler

The first version of the assembler will only support 16-bit instructions and a
subset of the full Intel instructions set. The idea is to build enough of an
assembler that we can use for writing a minimal C language compiler.

I will be using the NASM syntax ([Netwide assembler](http://www.nasm.us/))
rather than MASM (Microsoft's assembler) simply because I find it more
intuitive.

_(Ideas and some code borrowed from Edmund Grimley Evans'
[bootstrapping assembler](http://www.rano.org/bcompiler.html).)_

Since the assembler will have to be bootstrapped, we need to start simple and
build up. The very first program will be hand-entered in a binary editor, which
will be very tedious, but necessary.

## Version 0.1

This version simply prints the banner and copyright information to the screen
using OS-supplied functions to print. After it's done, it will return to the
kernel.

### OS Requirements

The RockOS kernel will load us into memory, having already set the necessary
segment registers and set up the stack. It will use the `call` instruction to a
specific memory location (`0x2000:8000`), so in order to return back to the
kernel the assembler will use the `ret` instruction.

Additionally, RockOS will expose some functions for us to use in the same
segment as the assembler so we can simply use a `call` instruction with an
absolute address and not have to worry about the segment. See the
[RockOS Application Development Handbook](rockos-app-dev-asm.md) for details on
the OS-provided system calls.

## Version 0.2

Let's add two more OS calls that we're going to need before we can start our
assembler: `os_read_sectors` and `os_write_sectors`. The assembler will start
reading from sector 97 (0-based) at `0x0C200`, which is where our text file to
be assembled will reside. It will read in one sector at a time, to keep the
working memory down to a minimum. Since the assembler is forward-only at this
point and since it will be terminated by a null character, we can tell when
we're done reading sectors.

The assembler will then just write the same block of memory back to disk,
starting at sector 1073 (`0x86200`), one block at a time. This admittedly
doesn't do much, but it tests our OS functions and sets us up for assembling hex
pairs in a future step.

To get the file off of disk, we'll use the `rockdisk` tool to pull out a section
of the floppy into a new file that we can use to compare against our
hand-assembled version. There is a `postbuild.bat` file used to pull off 24KB
starting from address `0x86200`.

## Version 0.3

This is the first step in a bootstrapping assembler. This version understands
hex pairs that get translated into binary machine code. It also understands
comments starting with the ; character and ending at a line break. Hex codes
start with a ~ character so that it will be easier to parse the rudimentary
grammar. The assembler is going to need to use the two new OS functions (as of
v0.6), `os_int_to_string` and `os_string_to_int` to parse the hex pairs.

The assembled file will get written back to disk at logical sector 1073
(`0x86200`) and can be a maximum of 24KB.

### Lexical Grammar

```text
input:
  token
  comment
  whitespace

token:
  '~'

comment:
  ';' any char beside new line '\n'

whitespace:
  ' ', '\t', '\r', '\n'
```

### Grammar

```text
compilationUnit:
  hexPairsOpt

hexPairs:
  hexPair hexPairs
  hexPair

hexPair:
  '~' '[0-9a-f]' '[0-9a-f]'
```

## Version 0.4

This is the same as version 0.3 except it writes out the assembled file to disk
at logical sector 2113 (`0x108200`) and can be a maximum of 28KB. This
corresponds to the new OS v0.7 disk sector layout and memory map.
