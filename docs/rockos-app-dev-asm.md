RockOS Application Development Handbook (Assembly Version)
================================================================================

This handbook describes how to develop applications for the RockOS platform in
assembly language, using the RockAsm assembler.

Basic Architecture
--------------------------------------------------------------------------------
The first version of RockOS is simple in nature, but fairly limited. It runs in
16-bit real mode and limits itself to 64KB of memory so that it will fit
entirely in a single segment. That simplifies having to worry about segment
registers.

### Loading
When the OS loads your program, it will load into address `0x2000:8000`. It will
also set the necessary segment registers and set up the stack so that you don't
have to worry about it.

The OS will execute your program by using a `call` instruction to a near
absolute memory location (`0x2000:8000`), so in order quit your application and
return back to the OS, you use the `ret` instruction.

System Calls
--------------------------------------------------------------------------------
RockOS exposes the following functions for your programs to use. They are in the
same segment as the programs so they can simply use a `call` instruction with an
absolute address and not have to worry about the segment. Internally, it's
implemented as a table of `jmp` instructions to the start of each function.
That allows the kernel to change without requiring external programs to change.

**Calling Convention**

The system calls use the 16-bit `cdecl` calling convention, which has the
following behavior:

* The caller is responsible to push arguments onto the stack in right-to-left
  order.
* The caller is responsible for cleaning up the stack after the call (popping
  the arguments).
* The following registers are volatile: `AX BX CX DX ST(0)-ST(7) ES`
* The following regsiters are non-volatile: `SI DI BP SP CS DS FS GS`
* Return values are stored in the `AX` register for 8-bit, 16-bit, or near
  pointer values.
* Return values are stored in the `AX:DX` pair for 32-bit or far pointer values.

For example, consider the following C code:

```C
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




Screen
--------------------------------------------------------------------------------

### `os_print_char(char)`
Prints a character to the console.

|                |                             |
|----------------|-----------------------------|
| **Address**    | 0x0C                        |
| **Parameters** | `char` - character to print |
| **Returns**    | Nothing                     |


### `os_print_line(str)`
Prints a null-terminated string to the screen followed by a new line sequence
(carriage return/line feed combination, CR/LF).

|                |                           |
|----------------|---------------------------|
| **Address**    | 0x06                      |
| **Parameters** | `str` - address of string |
| **Returns**    | Nothing                   |


### `os_print_newline()`
Prints a new line sequence (carriage return/line feed combination, CR/LF).

|                |                         |
|----------------|-------------------------|
| **Address**    | 0x09                    |
| **Parameters** | None                    |
| **Returns**    | Nothing                 |


### `os_print_string(str)`
Prints a null-terminated string to the screen.

|                |                           |
|----------------|---------------------------|
| **Address**    | 0x03                      |
| **Parameters** | `str` - address of string |
| **Returns**    | Nothing                   |
