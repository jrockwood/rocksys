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

## Algorithms

### `os_binary_search(*key, *base, num, width, *compare, **insertion_address)`

> Performs a binary search of a sorted array.

The function diverges slightly from the C runtime function in that the last
parameter is a pointer to the place in which the element should be inserted if
the element is not found. The rest of the function declaration matches the C
runtime function.

#### C Declaration

```c
void *bsearch(
  const void *key,
  const void *base,
  size_t num,
  size_t width,
  int (__cdecl *compare)(const void *key, const void *datum),
  intptr_t **insertion_address
)
```

#### Call Information

- **Address** - `0x2D`
- **Returns**
  - `AX` - a pointer to an occurrence of key in the array pointed to by base. If
    key is not found, the function returns NULL. If the array is not in
    ascending sort order or contains duplicate records with identical keys, the
    result is unpredictable.
- **Parameters**
  - `key` - object to search for
  - `base` - pointer to base of search data
  - `num` - number of elements
  - `width` - width of elements in bytes
  - `compare` - callback function that compares two elements - the first is a
    pointer to the key for the search and the second is a pointer to the array
    element to be compared with the key. If NULL, the default comparison
    function is used, which dereferences the pointers and compares integers.
  - `insertion_address` - **(Output)** pointer to an address which will contain
    the address of either the found element (which matches the return value), or
    the place in which the element should be inserted. Can be NULL if the caller
    doesn't need the insertion address.

## Data Structures

### Sorted Array

> A sorted array uses the binary search algorithm to keep elements in sorted
> order.

#### C Declaration

```c
struct SortedArray
{
  const void *base;
  const size_t max_count;
  const size_t width;
  int (__cdecl *compare)(const void *key, const void *datum);
  size_t count;
}
```

### `os_sorted_array_add(*sorted_array, key, *element)`

> Adds an element to the array in sorted order.

#### Call Information

- **Address** - `0x3C`
- **Returns**
  - `AX` - address of where the element was added, or 0 if the array is full
- **Parameters**
  - `*sorted_array` - pointer to a sorted array structure, as previously
    returned via `os_sorted_array_create`
  - `key` - key of the element to add
  - `*element` - pointer to the element to copy to the array

### `os_sorted_array_clear(*sorted_array)`

> Clears all elements from the array.

#### Call Information

- **Address** - `0x42`
- **Returns** - Nothing
- **Parameters**
  - `*sorted_array` - pointer to a sorted array structure, as previously
    returned via `os_sorted_array_create`

### `os_sorted_array_create(*base, max_num, width, *compare)`

> Creates a sorted array data structure that grows and shrinks within a fixed
> area of memory.

#### Call Information

- **Address** - `0x39`
- **Returns**
  - `AX` - a pointer to the sorted array structure, or 0 if the sorted array
    could not be created
- **Parameters**
  - `*base` - pointer to the area of memory that will contain the array's data
  - `max_num` - maximum number of elements
  - `width` - width of elements in bytes
  - `*compare` - callback function that compares two elements - the first is a
    pointer to the key for the search and the second is a pointer to the array
    element to be compared with the key.

### `os_sorted_array_find(*sorted_array, key)`

> Finds an element in the array.

#### Call Information

- **Address** - `0x3F`
- **Returns**
  - `AX` - address of where the element was found if it exists, or 0 if the
    element is not found
- **Parameters**
  - `*sorted_array` - pointer to a sorted array structure, as previously
    returned via `os_sorted_array_create`
  - `key` - object to search for

### `os_sorted_array_iterate(*sorted_array, *callback, *context)`

> Iterates over elements of the array in order by calling a callback function
> with each element.

The callback function has the following signature:

```c
bool (__cdecl *callback)(int index, const void *element, void *context)
```

Returning false from the callback breaks out of the iteration; true indicates
the iteration should continue.

#### Call Information

- **Address** - `0x5D`
- **Returns**
  - `AX` - the number of iterations performed
- **Parameters**
  - `*sorted_array` - pointer to a sorted array structure, as previously
    returned via `os_sorted_array_create`
  - `*callback` - callback function that is called on each iteration
  - `*context` - a user-supplied value that gets passed straight through to the
    callback

### `os_sorted_array_remove(*sorted_array, key)`

> Removes an element from the array if it exists.

#### Call Information

- **Address** - `0x3F`
- **Returns**
  - `AX` - address of where the element was found if it was removed, or 0 if the
    element was not found
- **Parameters**
  - `*sorted_array` - pointer to a sorted array structure, as previously
    returned via `os_sorted_array_create`
  - `key` - object to search for and remove

## Disk

### `os_read_sectors(sector_number, sector_count, *dest_address)`

> Reads the number of sectors from the floppy disk to the target address.

#### Call Information

- **Address** - `0x21`
- **Returns**
  - `AH` - error code
  - `AL` - 1 if successful, 0 if error
- **Parameters**
  - `sector_number` - logical sector number to read (0-based)
  - `sector_count` - number of sectors to read
  - `*dest_address` - destination address

### `os_write_sectors(sector_number, sector_count, *source_address)`

> Reads the number of sectors from the floppy disk to the target address.

#### Call Information

- **Address** - `0x24`
- **Returns**
  - `AH` - error code
  - `AL` - 1 if successful, 0 if error
- **Parameters**
  - `sector_number` - logical sector number to write (0-based)
  - `sector_count` - number of sectors to write
  - `*source_address` - source address

## Memory

### `os_free(*mem_block)`

> Deallocates or frees a block of memory.

#### C Declaration

```c
void free(void *memblock);
```

#### Call Information

- **Address** - `0x4B`
- **Returns** - Nothing
- **Parameters**
  - `*mem_block` - previously allocated memory block to be freed

### `os_malloc(size)`

> Allocates memory blocks from the heap.

#### C Declaration

```c
void *malloc(size_t size);
```

#### Call Information

- **Address** - `0x48`
- **Returns**
  - `AX` - address of the allocated memory, 0 if there is insufficient space
- **Parameters**
  - `size` - bytes to allocate

### `os_mem_move(*dest, *src, count)`

> Copies count bytes of characters from src to dest.

If some regions of the source area and the destination overlap, memmove ensures
that the original source bytes in the overlapping region are copied before being
overwritten.

#### C Declaration

```c
void *memmove(
  void *dest,
  const void *src,
  size_t count)
```

#### Call Information

- **Address** - `0x30`
- **Returns**
  - `AX` - the destination buffer (value of `dest`)
- **Parameters**
  - `*dest` - pointer to destination buffer
  - `*src` - pointer to source buffer
  - `count` - number of bytes to copy

### `os_mem_set(*dest, c, count)`

> Sets buffers to a specified character.

#### Call Information

- **Address** - `0x57`
- **Returns**
  - `AX` - the destination buffer (value of `dest`)
- **Parameters**
  - `*dest` - pointer to destination buffer
  - `c` - character to set
  - `count` - number of characters

## Screen

### `os_print_char(char)`

> Prints a character to the console.

#### Call Information

- **Address** - `0x0C`
- **Returns** - Nothing
- **Parameters**
  - `char` - character to print

### `os_print_hex_byte(byte, should_print_prefix)`

> Prints the low byte in hexidecimal format, with an optional prefix.

#### Call Information

- **Address** - `0x15`
- **Returns** - Nothing
- **Parameters**
  - `byte` - byte to print
  - `should_print_prefix` - non-zero if the '0x' prefix should be printed

### `os_print_hex_nibble(nibble, should_print_prefix)`

> Prints the low nibble in hexidecimal format, with an optional prefix.

#### Call Information

- **Address** - `0x12`
- **Returns** - Nothing
- **Parameters**
  - `nibble` - number to print
  - `should_print_prefix` - non-zero if the '0x' prefix should be printed

### `os_print_hex_word(word, should_print_prefix)`

> Prints the word in hexidecimal format, with an optional prefix.

#### Call Information

- **Address** - `0x18`
- **Returns** - Nothing
- **Parameters**
  - `word` - number to print
  - `should_print_prefix` - non-zero if the '0x' prefix should be printed

### `os_print_int(number, format)`

> Prints an integer using the specified format.

#### Call Information

- **Address** - `0x27`
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

### `os_print_line(str)`

> Prints a null-terminated string to the screen followed by a new line sequence
> (carriage return/line feed combination, CR/LF).

#### Call Information

- **Address** - `0x06`
- **Returns** - Nothing
- **Parameters**
  - `str` - address of string

### `os_print_memory(*address, line_count)`

> Prints the contents of memory at the specified address. Useful for debugging.

#### Call Information

- **Address** - `0x1E`
- **Returns** - Nothing
- **Parameters**
  - `*address` - the address of the memory to print
  - `line_count` - the number of lines of 8 bytes to print

### `os_print_newline()`

> Prints a new line sequence (carriage return/line feed combination, CR/LF).

#### Call Information

- **Address** - `0x09`
- **Returns** - Nothing
- **Parameters** - None

### `os_print_registers()`

> Prints all of the general purpose register values. Useful for debugging.

#### Call Information

- **Address** - `0x1B`
- **Returns** - Nothing
- **Parameters** - None

### `os_print_space()`

> Prints a space character to the screen.

#### Call Information

- **Address** - `0x0F`
- **Returns** - Nothing
- **Parameters** - None

### `os_print_string(str)`

> Prints a null-terminated string to the screen.

#### Call Information

- **Address** - `0x03`
- **Returns** - Nothing
- **Parameters**
  - `str` - address of string

## String

### `os_int_to_string(number, format, *buffer)`

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

### `os_string_compare(string1, string2)`

> Performs an ordinal comparison of `string1` and `string2` and returns a value
> that indicates their relationship.

#### Call Information

- **Address** - `0x36`
- **Returns**
  - `AX` - indicates the ordinal relation of `string1` to `string2`, according
    to the table below
- **Parameters**
  - `string1` - first string to compare
  - `string2` - second string to compare

The return value is one of the following:

| Value | Relationship of `string1` to `string2` |
| ----- | -------------------------------------- |
| < 0   | `string1` is less than `string2`       |
| 0     | `string1` is identical to `string2`    |
| > 0   | `string1` is greater than `string2`    |

### `os_string_copy(*dest, *src)`

> Copies a string.

#### Call Information

- **Address** - `0x5A`
- **Returns**
  - `AX` - the destination string
- **Parameters**
  - `dest` - the destination string
  - `src` - the null-terminated source string

### `os_string_length(string)`

> Gets the number of bytes in the string (not including the null termination
> character).

#### Call Information

- **Address** - `0x33`
- **Returns**
  - `AX` - the length of the string, not including the null termination
    character
- **Parameters**
  - `string` - address of a null-terminated string to get the length of

### `os_string_to_int(string, format)`

> Converts a string into an integer.

#### Call Information

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
