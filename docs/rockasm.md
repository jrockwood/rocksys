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
[RockOS Application Development Handbook](rock-os-app-dev-asm.md) for details on
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

Woohoo! We have a working assembler. It's rudimentary, but it's a great start.
We still have to hand-assemble code, but at least we don't have to manually
enter it into a hex editor anymore.

The biggest pain point now is manually counting bytes for `jmp` and `call`
statements, especially when adding/removing lines of code. It's really easy to
forget to update references. So we'll need to support some kind of labels. This
has several implications:

1. We need a data structure to store the label's name and the address of the
   label. We'll use a sorted array using binary search since that's simpler to
   implement than a hash table. The kernel still doesn't have any heap or memory
   management, so we will need to manage our own memory.

2. The assembler will need two passes instead of one. This is because labels can
   be used before they're declared. We should also probably implement a lexing
   phase and a compile phase. That will allow us to store larger programs all in
   memory instead of paging them in from disk. But that can come later.

3. We have the concept of locally-scoped labels that start with a '.' period
   character.

### Phases

**Phase A** Build the ability to correctly lex identifiers and parse labels.

**Phase B** Implement a 2-pass compiler and count the bytes. Pass 1 will lex and
parse and count the bytes and pass 2 will do the actual compiling and write out
to disk.

**Phase C** Write a sorted array with binary search to store the label/ address
pairs. Since this is a general-purpose algorithm, we'll add it to the kernel.

**Phase D** Pre-allocate a chunk of memory that will be used for storing the
label strings and create a sorted array of pointers into the string table.
During pass 0 every time a label declaration is encountered, check for a
duplicate in the lookup. If a duplicate is found, report an error, otherwise add
it to the string table and the lookup. This means that locally-scoped labels
starting with a '.' have to be unique for now. Also add a functon that prints
the string lookup table to verify that it's working.

**Phase E** During pass 0 create the lookup table of labels with their address
(which is just the byte count at the point when the label is declared). It will
also detect duplicate labels and report an error. In addition, support local
(private) labels, which start with a '.'. Each label declaration will store a
sorted array of a maximum of 10 child label declarations, which should be
sufficient for now.

To get each phase working we have to keep bootstrapping the assembler with new
functionality. Here's the general process:

1. Program the new functionality for phase X in `rockasm-x.rasm`.
2. Use the assembler from phase X-1 to assemble phase X.
3. Start phase X+1 by creating `rockasm-x+1.rasm` using the new functionality,
   but not adding any new functionality (for example uncommenting labels if we
   just added label support).
4. Make sure `rockasm-x+1.rasm` gets assembled correctly using phase X.
5. Repeat.

### Lexical Grammar

```text
input:
  token
  comment
  whitespace

token:
  identifier
  operator-or-punctuator

identifier:
  identifier-start-character identifier-part-character*

identifier-start-character:
  letter-character
  '.', '_', '?'

identifier-part-character:
  letter-character
  decimal-digit-character
  '_', '$', '#', '@', '~', '.', '?'

letter-character:
  'A'-'Z', 'a'-'z'

decimal-digit-character:
  '0'-'9'

operator-or-punctuator: one of
  '~' ':'

comment:
  ';' any char beside new line '\n'

whitespace:
  ' ', '\t', '\r', '\n'
```

### Grammar

```text
compilation-unit:
  statement*

statement:
  label-declaration
  hex-pair

label-declaration:
  identifier ':'

hex-pair:
  '~' '[0-9a-f]' '[0-9a-f]'
```
