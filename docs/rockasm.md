RockAsm - Rockwood Assembler
================================================================================

Version 1
--------------------------------------------------------------------------------

The first version of the assembler will only support 16-bit instructions and a
subset of the full Intel instructions set. The idea is to build enough of an
assembler that we can use for writing a minimal C language compiler.

I will be using the NASM syntax ([Netwide assembler](http://www.nasm.us/))
rather than MASM (Microsoft's assembler) simply because I find it more intuitive.

*(Ideas and some code borrowed from Edmund Grimley Evans'
[bootstrapping assembler](http://www.rano.org/bcompiler.html).)*

### Steps

Since the assembler will have to be bootstrapped, we need to start simple and
build up. The very first program will be hand-entered in a binary editor, which
will be very tedious, but necessary.

### Version 0.1

This version simply prints the banner and copyright information to the screen
using OS-supplied functions to print. After it's done, it will return to the
kernel.

**OS Requirements**

The RockOS kernel will load us into memory, having already set the necessary
segment registers and set up the stack. It will use the `call` instruction to a
specific memory location (`0x2000:8000`), so in order to return back to the
kernel the assembler will use the `ret` instruction.

Additionally, RockOS will expose some functions for us to use in the same
segment as the assembler so we can simply use a `call` instruction with an
absolute address and not have to worry about the segment. See the [RockOS
Application Development Handbook](rock-os-app-dev-asm.md) for details on the
OS-provided system calls.
