# RockAsm - Rockwood Assembler

## Version 1

The first version of the assembler will only support 16-bit instructions and a
subset of the full Intel instructions set. The idea is to build enough of an
assembler that we can use for writing a minimal C language compiler.

I will be using the NASM syntax ([Netwide assembler](http://www.nasm.us/))
rather than MASM (Microsoft's assembler) simply because I find it more
intuitive.

_(Ideas and some code borrowed from Edmund Grimley Evans'
[bootstrapping assembler](http://www.rano.org/bcompiler.html).)_

### Steps

Since the assembler will have to be bootstrapped, we need to start simple and
build up. The very first program will be hand-entered in a binary editor, which
will be very tedious, but necessary.

### Version 0.1

This version simply prints the banner and copyright information to the screen
using OS-supplied functions to print. After it's done, it will return to the
kernel.

#### OS Requirements

The RockOS kernel will load us into memory, having already set the necessary
segment registers and set up the stack. It will use the `call` instruction to a
specific memory location (`0x2000:8000`), so in order to return back to the
kernel the assembler will use the `ret` instruction.

Additionally, RockOS will expose some functions for us to use in the same
segment as the assembler so we can simply use a `call` instruction with an
absolute address and not have to worry about the segment. See the
[RockOS Application Development Handbook](rock-os-app-dev-asm.md) for details on
the OS-provided system calls.

### Version 0.2

Let's add two more OS calls that we're going to need before we can start our
assembler: `os_read_sectors` and `os_write_sectors`. The assembler will start
reading from sector 7, which is where our text file to be assembled will reside.
It will read in one sector at a time, to keep the working memory down to a
minimum. Since the assembler is forward-only at this point and since it will be
terminated by a null character, we can tell when we're done reading sectors.

The assembler will then just write the same block of memory back to disk,
starting at sector 136 (0x11000).

### Version 0.3

The assembler is going to need to use the two new OS functions (as of v0.6),
`os_int_to_string` and `os_string_to_int`. This version simply adds some unit
tests for those two functions. Arguably those unit tests should be in the kernel
file and not in the assembler, but it was easier to put them here.

### Version 0.4

This is the first step in a bootstrapping assembler. This version understands
hex pairs that get translated into binary machine code. It also understands
comments starting with the ; character and ending at a line break. Hex codes
start with a ~ character so that it will be easier to parse the rudimentary
grammar.

The assembled file will get written back to disk at sector 135 (0x10E00). To get
the file off of disk, we'll use the `rockcopy` tool to pull out a section of the
floppy into a new file that we can use to compare against our hand-assembled
version. There is a `postbuild.bat` file used to pull off 16KB starting from
address 0x11000.

#### Lexical Grammar

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

#### Grammar

```text
compilationUnit:
  hexPairsOpt

hexPairs:
  hexPair hexPairs
  hexPair

hexPair:
  '~' '[0-9a-f]' '[0-9a-f]'
```

### Version 0.5

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

#### Phases

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

#### Lexical Grammar

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

#### Grammar

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

### Version 0.6

The assembler now has the infrastructure to support labels, but it doesn't use
them yet. Time to beef up the lexing and parsing to support more constructs than
just a label declaration and a hex pair.

The assembler already performs two passes, but it needs to be tweaked to do a
lexing pass first and then perform two parsing passes. Once the lexing is done
it doesn't need to load from the disk again since the input has been transformed
to an array of tokens. The parsing phase then iterates over the tokens, with the
first pass storing the label declarations and the second pass actually
compiling.

#### Phases

**Phase A** We're going to need a lot of space for more strings, but we're all
out, so add another 512 bytes of space. This changes all of the addresses for
almost everything, so doing just this change will help determine if we got it
right and makes further changes easy to see in a diff.

**Phase B** Add the concept of reading and peeking characters, which will help
when adding a separate lexing and parsing phase.

**Phase C** Implement a lexing and parsing phase. The lexing phase will strip
out comments and whitespace and produce a series of tokens. The parsing phase
consumes the tokens and produces the assembled machine code. Since memory is
limited, we're still reading one block at a time from disk instead of storing
all of the tokens. However, the parser doesn't know or care that we're reading
from disk. It uses `peek_token` and `read_token` only.

**Phase D** Start using the tokens to compile instructions. Start with
`call rel16`, `jmp rel8` and all of the conditional jump instructions (`jl`,
`jle`, `jg`, `jge`, `je`, `jne`, etc.).

#### Lexical Grammar

```text
input:
  token
  comment
  whitespace
  newline-or-eof

token:
  byte-literal
  keyword
  identifier
  operator-or-punctuator

byte-literal:
  '~' '[0-9a-f]' '[0-9a-f]'

keyword: (one of)
  'call'
  'ja'  'jae'  'jb'  'jbe'  'jc'  'jcxz' 'je'  'jg'  'jge'  'jl'  'jle'  'jmp'
  'jna' 'jnae' 'jnb' 'jnbe' 'jnc'        'jne' 'jng' 'jnge' 'jnl' 'jnle'
  'jno' 'jnp'               'jns' 'jnz'
  'jo'  'jp'   'jpe' 'jpo'  'js'  'jz'

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

operator-or-punctuator: (one of)
  ':'

comment:
  ';' any char beside new line '\n'

whitespace: (one of)
  ' ' '\t' '\r'

newline-or-eof:
  '\n' end of file
```

#### Grammar

```text
compilation-unit:
  source-line*

source-line:
  label-declaration-opt byte-literal* newline-or-eof
  label-declaration-opt instruction-opt newline-or-eof

label-declaration:
  identifier ':'

instruction:
  call-instruction
  jump-instruction

call-instruction:
  'call' identifier

jump-instruction:
  non-conditional-jump-instruction
  conditional-jump-operation identifier

non-conditional-jump-instruction:
  'jmp' identifier

conditional-jump-operation: (one of)
  'ja'  'jae'  'jb'  'jbe'  'jc'  'jcxz' 'je'  'jg'  'jge'  'jl'  'jle'
  'jna' 'jnae' 'jnb' 'jnbe' 'jnc'        'jne' 'jng' 'jnge' 'jnl' 'jnle'
  'jno' 'jnp'               'jns' 'jnz'
  'jo'  'jp'   'jpe' 'jpo'  'js'  'jz'

```

### Version 0.7 - Simple Instructions and push/pop

There are a few really simple instructions that are easy to parse and assemble
and will cut down on the amount of manual assembling required.

#### Phases

**Phase A** Before we do anything else, let's finish a few really simple
instructions that take no arguments and generate a single byte opcode: `ret`,
`lodsb`, and `stosb`.

**Phase B** Let's tackle single arguments next, starting with `push` and `pop`,
and only the forms `r16` for now. That means the assembler will have to
correctly parse the general purpose register names `ax`, `bx`, `cx`, `dx`, `sp`,
`bp`, `si`, and `di`. We might as well support the special-case push and pop of
segment registers also: `cs`, `ds`, `es`, `fs`, `gs`, and `ss`.

#### Lexical Grammar

```text
input:
  token
  comment
  whitespace
  newline-or-eof

token:
  byte-literal
  keyword
  identifier
  operator-or-punctuator

byte-literal:
  '~' '[0-9a-f]' '[0-9a-f]'

keyword: (one of)
  'ax'
  'bp' 'bx'
  'call' 'cli' 'cs' 'cx'
  'di' 'ds' 'dx'
  'es'
  'fs'
  'gs'
  'ja'  'jae'  'jb'  'jbe'  'jc'  'jcxz' 'je'  'jg'  'jge'  'jl'  'jle'  'jmp'
  'jna' 'jnae' 'jnb' 'jnbe' 'jnc'        'jne' 'jng' 'jnge' 'jnl' 'jnle'
  'jno' 'jnp'               'jns' 'jnz'
  'jo'  'jp'   'jpe' 'jpo'  'js'  'jz'
  'lodsb' 'lodsw'
  'nop'
  'pop' 'push'
  'ret'
  'si' 'sp' 'ss' 'sti' 'stosb' 'stosw'

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

operator-or-punctuator: (one of)
  ':'

comment:
  ';' any char beside new line '\n'

whitespace: (one of)
  ' ' '\t' '\r'

newline-or-eof:
  '\n' end of file
```

#### Grammar

```text
compilation-unit:
  source-line*

source-line:
  label-declaration-opt byte-literal* newline-or-eof
  label-declaration-opt instruction-opt newline-or-eof

label-declaration:
  identifier ':'

instruction:
  call-instruction
  jump-instruction
  pop-instruction
  push-instruction
  standalone-instruction

call-instruction:
  'call' identifier

jump-instruction:
  non-conditional-jump-instruction
  conditional-jump-operation identifier

non-conditional-jump-instruction:
  'jmp' identifier

pop-instruction:
  'pop' register-16
  'pop' pop-segment-register

pop-segment-register: (one of)
  'ds' 'es' 'fs' 'gs' 'ss'

push-instruction:
  'push' register-16
  'push' segment-register

standalone-instruction: (one of)
  'cli' 'lodsb' 'lodsw' 'nop' 'ret' 'sti' 'stosb' 'stosw'

conditional-jump-operation: (one of)
  'ja'  'jae'  'jb'  'jbe'  'jc'  'jcxz' 'je'  'jg'  'jge'  'jl'  'jle'
  'jna' 'jnae' 'jnb' 'jnbe' 'jnc'        'jne' 'jng' 'jnge' 'jnl' 'jnle'
  'jno' 'jnp'               'jns' 'jnz'
  'jo'  'jp'   'jpe' 'jpo'  'js'  'jz'

```

### Version 0.8 - Expressions

Instructions like `push my_label + 2` or `times 0x1000 - ($ - $$)` contain
expressions that we need to start parsing.

#### Phases

**Phase A - Memory Adjustments** The assembler source file size is nearing the
limit of 132KB, which means trouble when the compiled program gets written back
to disk since only 132KB was allocated between the source file and the compiled
output. We'll bump it up to 500KB (0x7A000), which should give us plenty of
growing room. The postbuild.bat file will need to be updated also.

One other problem... the compiled program is almost at 8KB, which is the amount
of space allocated between the start of the assembler in memory and the disk
read buffer. This means that once the program gets larger than 8KB (which it
will after Phase B) then the last part of the assembler will get overwritten
when reading from disk.

Here's what the memory map looks like for the running assembler before the
changes made in this phase:

**Note:** _The address is a half-open range, not including the ending number_

| Address     | Size  | Description                                                                                                                                |
| ----------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 0x8000-A000 | 8 KB  | The kernel loads the assembler into this address                                                                                           |
| 0xA000-A200 | 512 B | Disk read buffer to hold one sector's worth of data                                                                                        |
| 0xA200-A400 | 512 B | Disk write buffer to hold one sector's worth of data before flushing out to disk                                                           |
| 0xA400-BC00 | 6 KB  | Buffer to hold all of the strings (labels). 6K of strings at 32 bytes max per string = 192 strings (minimum).                              |
| 0xBC00-BE00 | 512 B | Sorted array for the string lookup                                                                                                         |
| 0xBE00-C600 | 2 KB  | Sorted array of the label declarations. 255 max labels at 6 bytes per label = 1530 bytes. Round up to 2K, so the ending address is 0xC600. |

Since the assembler is allowed to use up to address 0xF000, that gives us a
total of 28 KB. We need more space for the assembler code. We're currently at
roughly 240 unique strings, which is about 480 B of storage and dangerously
close to the 512 B limit, so we'd better increase that also. We have almost 90
labels, but that's far away from our 255 label max, so we should be good to keep
that amount for now.

Another way to get 1KB back is to use the kernel's os_malloc function to give us
space from the kernel's memory pool. Here's the new allocation.

- 14 KB - Assembler code
- 1 KB - Disk buffers
- 10 KB - String buffer to be able to hold at least 320 unique strings
- 1 KB - String lookup array
- 2 KB - Label declaration array to store 255 labels
- **Total: 28 KB**

| Address     | Size  | Description                                      |
| ----------- | ----- | ------------------------------------------------ |
| 0x8000-B800 | 14 KB | The kernel loads the assembler into this address |
| 0xB800-BA00 | 512 B | Disk read buffer                                 |
| 0xBA00-BC00 | 512 B | Disk write buffer                                |
| 0xBC00-E400 | 10 KB | Buffer to hold all of the strings (labels)       |
| 0xE400-E800 | 1 KB  | Sorted array for the string lookup               |
| 0xE800-F000 | 2 KB  | Sorted array of the label declarations           |

**Phase B - Plain Numbers** We need a way to test the expressions, so let's
implement `push imm8` and `push imm16`. We already implemented `push r16` and
`push sreg` so we already understand the 'push' keyword. It shouldn't be too
hard to add expression parsing to the 'push' instruction. First add numeric
constants, but only a subset of what NASM supports. Decimal and hexidecimal
numbers with a leading '0x', '0X', '0h', or '0H' prefix for hexidecimal numbers
are supported, but octal or binary numbers are not supported. Additionally,
trailing suffixes are not supported. You can use the '\_' character interspersed
in the number to break up long strings.

**Phase C - Identifier Expressions** An identifier expression is simply
replacing the offset of where the identifier is declared. We'll need to do a
lookup and account for which pass we're in if the identifier isn't found (it
isn't an error until after the first pass since it might not have been declared
yet). We'll also throw in expressions of the form '(' expression ')', which will
complete the `primary-expression` grammar rule.

**Phase D - Complete Expressions** All of the rest of the expressions are
implemented since they're all almost identical implementations.

**Phase E - ORG directive** In order for most of the expressions to be usable,
the assembler has to support the [ORG] directive, which is the address at which
the program begins when loaded into memory.

**Phase F - String constants** An expression can also have a string constant,
but the assembler doesn't understand them yet.

**Phase G - More Memory Adjustments** The assembler is starting to get bigger in
the amount of memory it needs. After Phase F, the assembler is using 302 unique
strings, 124 labels, and 5644 lines of code. We're going to run out of string
space with the next iteration unless we do something. We have a couple of
options:

1. Remove a bunch of descriptive labels and use labels like `.jump1`, `.jump2`,
   etc. This will probably cut down the unique labels to something like 100-150,
   which helps but only buys us so much time and reduces the readability of the
   code.

2. Put all of the strings in another segment, which gives us 64KB of space, but
   will be harder to program since we'll have to switch segment registers.

I'm choosing option 2 because all of the code dealing with actually storing the
strings is constrained to a single function: `add_string_lookup`. It won't be
too difficult to modify and it will give the assembler lots of room to grow. I
added a convention to the RockOS documentation to allow external programs (the
assembler) to access segment 0x3000:0000 (0x30000), which we'll use for the
string table.

Here's the new allocation:

- 14 KB - Assembler code
- 1 KB - Disk buffers
- 10 KB - String buffer to be able to hold at least 320 unique strings
- 1 KB - String lookup array
- 2 KB - Label declaration array to store 255 labels
- **Total: 28 KB**

| Address     | Size  | Description                                      |
| ----------- | ----- | ------------------------------------------------ |
| 0x8000-B800 | 14 KB | The kernel loads the assembler into this address |
| 0xB800-BA00 | 512 B | Disk read buffer                                 |
| 0xBA00-BC00 | 512 B | Disk write buffer                                |
| 0xBC00-E400 | 10 KB | Buffer to hold all of the strings (labels)       |
| 0xE400-E800 | 1 KB  | Sorted array for the string lookup               |
| 0xE800-F000 | 2 KB  | Sorted array of the label declarations           |

#### Lexical Grammar

```text
input:
  comment
  newline-or-eof
  whitespace
  token

comment:
  ';' any char beside new line '\n'

newline-or-eof:
  '\n' end of file

whitespace: (one of)
  ' ' '\t' '\r'

token:
  byte-literal
  identifier
  keyword
  constant
  operator-or-punctuator

byte-literal:
  '~' '[0-9a-f]' '[0-9a-f]'

identifier:
  identifier-start-character identifier-part-character*

identifier-start-character:
  letter-character
  '.', '_', '?'

identifier-part-character:
  letter-character
  decimal-digit
  '_', '$', '#', '@', '~', '.', '?'

letter-character:
  '[A-Za-z]'

decimal-digit:
  '[0-9]'

keyword: (one of)
  'ax'
  'bp' 'bx'
  'call' 'cli' 'cs' 'cx'
  'di' 'ds' 'dx'
  'es'
  'fs'
  'gs'
  'ja'  'jae'  'jb'  'jbe'  'jc'  'jcxz' 'je'  'jg'  'jge'  'jl'  'jle'  'jmp'
  'jna' 'jnae' 'jnb' 'jnbe' 'jnc'        'jne' 'jng' 'jnge' 'jnl' 'jnle'
  'jno' 'jnp'               'jns' 'jnz'
  'jo'  'jp'   'jpe' 'jpo'  'js'  'jz'
  'lodsb' 'lodsw'
  'nop'
  'pop' 'push'
  'ret'
  'si' 'sp' 'ss' 'sti' 'stosb' 'stosw'

constant:
  character-constant
  numeric-constant

character-constant:
  ''' char[0,2] (except ') '''
  '"' char[0,2] (except ") '"'
  '`' char-or-escape-sequence[0,2] '`'

char-or-escape-sequence:
  char
  escape-sequence

escape-sequence:
  '\''  - single quote (')
  '\"'  - double quote (")
  '\`'  - backquote (`)
  '\\'  - backslash (\)
  '\?'  - question mark (?)
  '\0'  - NUL (ASCII 0)
  '\a'  - BEL (ASCII 7)
  '\b'  - BS  (ASCII 8)
  '\t'  - TAB (ASCII 9)
  '\n'  - LF  (ASCII 10)
  '\v'  - VT  (ASCII 11)
  '\f'  - FF  (ASCII 12)
  '\r'  - CR  (ASCII 13)
  '\e'  - ESC (ASCII 27)
  '\x' hexidecimal-digit hexidecimal-digit?

numeric-constant:
  decimal-numeric-constant
  hexidecimal-numeric-constant

decimal-numeric-constant:
  decimal-digit ('_' or decimal_digit)*

hexidecimal-numeric-constant:
  hexidecimal-prefix ('_' or hexidecimal-digit)*

hexidecimal-prefix: (one of)
  '0x' '0X' '0h' '0H'

hexidecimal-digit:
  decimal-digit
  '[a-f]'
  '[A-F]'

operator-or-punctuator: (one of)
  ':' '|' '^' '&' '<<' '>>' '+' '-' '*' '/' '//' '%' '%%' '~' '!' '(' ')'
  '"' ''' ',' '[' ']' '`'
```

#### Grammar

```text
compilation-unit:
  source-line*

source-line:
  directive
  label-declaration-opt byte-literal* newline-or-eof
  label-declaration-opt instruction-opt newline-or-eof

directive:
  org-directive

org-directive:
  '[' 'ORG' expression ']'

label-declaration:
  identifier ':'

instruction:
  call-instruction
  jump-instruction
  pop-instruction
  push-instruction
  standalone-instruction

call-instruction:
  'call' identifier

jump-instruction:
  non-conditional-jump-instruction
  conditional-jump-operation identifier

non-conditional-jump-instruction:
  'jmp' identifier

pop-instruction:
  'pop' register-16
  'pop' pop-segment-register

pop-segment-register: (one of)
  'ds' 'es' 'fs' 'gs' 'ss'

push-instruction:
  'push' register-16
  'push' segment-register
  'push' expression

standalone-instruction: (one of)
  'cli' 'lodsb' 'lodsw' 'nop' 'ret' 'sti' 'stosb' 'stosw'

conditional-jump-operation: (one of)
  'ja'  'jae'  'jb'  'jbe'  'jc'  'jcxz' 'je'  'jg'  'jge'  'jl'  'jle'
  'jna' 'jnae' 'jnb' 'jnbe' 'jnc'        'jne' 'jng' 'jnge' 'jnl' 'jnle'
  'jno' 'jnp'               'jns' 'jnz'
  'jo'  'jp'   'jpe' 'jpo'  'js'  'jz'

expression:
  or-expression

or-expression:
  xor-expression ['|' xor-expression]*

xor-expression:
  and-expression ['^' and-expression]*

and-expression:
  shift-expression ['&' shift-expression]*

shift-expression:
  additive-expression [('<<' | '>>') additive-expression]*

additive-expression:
  multiplicative-expression [('+' | '-') multiplicative-expression]*

multiplicative-expression:
  unary-expression [('*' | '/' | '//' | '%' | '%%') unary-expression]*
  / and % are unsigned, // and %% are signed

unary-expression:
  ('+' | '-' | '~' | '!') unary-expression
  primary-expression

primary-expression:
  identifier
  constant
  '(' expression ')'
```

### Version 0.9 - r/m8 Instructions

Ok, we've got a two-phase assembler that handles labels, jumps, and calls. This
is a great stepping stone to fleshing out the assembler even more and adding
more instructions. The next class of instructions to tackle are of the form
`instr r/m8, r8` or `instr r8, r/m8` (or the 16-bit equivalents). Once we build
the infrastructure to parse those instructions, the assembler will be able to
understand a large portion of the remaining instructions we want to support.

#### Phases

**Phase A - ?**

#### Lexical Grammar

```text
input:
  comment
  newline-or-eof
  whitespace
  token

comment:
  ';' any char beside new line '\n'

newline-or-eof:
  '\n' end of file

whitespace: (one of)
  ' ' '\t' '\r'

token:
  byte-literal
  identifier
  keyword
  numeric-constant
  operator-or-punctuator

byte-literal:
  '~' '[0-9a-f]' '[0-9a-f]'

identifier:
  identifier-start-character identifier-part-character*

identifier-start-character:
  letter-character
  '.', '_', '?'

identifier-part-character:
  letter-character
  decimal-digit
  '_', '$', '#', '@', '~', '.', '?'

letter-character:
  '[A-Za-z]'

decimal-digit:
  '[0-9]'

keyword: (one of)
  'ax'
  'bp' 'bx'
  'call' 'cli' 'cs' 'cx'
  'di' 'ds' 'dx'
  'es'
  'fs'
  'gs'
  'ja'  'jae'  'jb'  'jbe'  'jc'  'jcxz' 'je'  'jg'  'jge'  'jl'  'jle'  'jmp'
  'jna' 'jnae' 'jnb' 'jnbe' 'jnc'        'jne' 'jng' 'jnge' 'jnl' 'jnle'
  'jno' 'jnp'               'jns' 'jnz'
  'jo'  'jp'   'jpe' 'jpo'  'js'  'jz'
  'lodsb' 'lodsw'
  'nop'
  'pop' 'push'
  'ret'
  'si' 'sp' 'ss' 'sti' 'stosb' 'stosw'

numeric-constant:
  decimal-numeric-constant
  hexidecimal-numeric-constant

decimal-numeric-constant:
  decimal-digit ('_' or decimal_digit)*

hexidecimal-numeric-constant:
  hexidecimal-prefix ('_' or hexidecimal-digit)*

hexidecimal-prefix: (one of)
  '0x' '0X' '0h' '0H'

hexidecimal-digit:
  decimal-digit
  '[a-f]'
  '[A-F]'

operator-or-punctuator: (one of)
  ':' '|' '^' '&' '<<' '>>' '+' '-' '*' '/' '//' '%' '%%' '~' '!' '(' ')'
  '"' ''' ',' '[' ']' '`'
```

#### Grammar

```text
compilation-unit:
  source-line*

source-line:
  directive
  label-declaration-opt byte-literal* newline-or-eof
  label-declaration-opt instruction-opt newline-or-eof

directive:
  org-directive

org-directive:
  '[' 'ORG' expression ']'

label-declaration:
  identifier ':'

instruction:
  call-instruction
  jump-instruction
  mov-instruction
  pop-instruction
  push-instruction
  standalone-instruction

call-instruction:
  'call' identifier

jump-instruction:
  non-conditional-jump-instruction
  conditional-jump-operation identifier

non-conditional-jump-instruction:
  'jmp' identifier

pop-instruction:
  'pop' register-16
  'pop' pop-segment-register

pop-segment-register: (one of)
  'ds' 'es' 'fs' 'gs' 'ss'

push-instruction:
  'push' register-16
  'push' segment-register
  'push' sized-expression

standalone-instruction: (one of)
  'cli' 'lodsb' 'lodsw' 'nop' 'ret' 'sti' 'stosb' 'stosw'

conditional-jump-operation: (one of)
  'ja'  'jae'  'jb'  'jbe'  'jc'  'jcxz' 'je'  'jg'  'jge'  'jl'  'jle'
  'jna' 'jnae' 'jnb' 'jnbe' 'jnc'        'jne' 'jng' 'jnge' 'jnl' 'jnle'
  'jno' 'jnp'               'jns' 'jnz'
  'jo'  'jp'   'jpe' 'jpo'  'js'  'jz'

mov-instruction:
  'mov' two-operands-with-segment-registers

two-operands-with-segment-registers:
  two-operands
  register-16 ',' segment-register
  segment-register ',' register-16

two-operands:
  register ',' sized-expression
  register-8 ',' register-8
  register-16 ',' register-16
  register ',' memory-address
  memory-address ',' register

register:
  register-8
  register-16

register-8: (one of)
  'ah' 'al' 'bh' 'bl' 'ch' 'cl' 'dh' 'dl'

register-16: (one of)
  'ax' 'bx' 'cx' 'dx'
  'sp' 'bp' 'si' 'di'

segment-register: (one of)
  'cs' 'ds' 'es' 'fs' 'gs' 'ss

memory-address:
  size-specifier-opt '[' 'bx' '+' 'si' memory-displacement-opt ']'
  size-specifier-opt '[' 'bx' '+' 'di' memory-displacement-opt ']'
  size-specifier-opt '[' 'bp' '+' 'si' memory-displacement-opt ']'
  size-specifier-opt '[' 'bp' '+' 'di' memory-displacement-opt ']'
  size-specifier-opt '[' 'si' memory-displacement-opt ']'
  size-specifier-opt '[' 'di' memory-displacement-opt ']'
  size-specifier-opt '[' expression ']'
  size-specifier-opt '[' 'bp' memory-displacement ']'
  size-specifier-opt '[' 'bx' memory-displacement-opt ']'

memory-displacement:
  '+' expression
  '-' expression

size-specifier:
  'byte'
  'word'

sized-expression:
  size-specifier-opt expression

expression:
  or-expression

or-expression:
  xor-expression ['|' xor-expression]*

xor-expression:
  and-expression ['^' and-expression]*

and-expression:
  shift-expression ['&' shift-expression]*

shift-expression:
  additive-expression [('<<' | '>>') additive-expression]*

additive-expression:
  multiplicative-expression [('+' | '-') multiplicative-expression]*

multiplicative-expression:
  unary-expression [('*' | '/' | '//' | '%' | '%%') unary-expression]*
  / and % are unsigned, // and %% are signed

unary-expression:
  ('+' | '-' | '~' | '!') unary-expression
  primary-expression

primary-expression:
  identifier
  numeric-constant
  '(' expression ')'
```
