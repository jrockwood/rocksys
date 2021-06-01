;
; syscalls.inc
; ------------
; This file is meant to be included in user programs to be able to make system
; calls.
;
; Copyright (c) 2020 Justin Rockwood. All rights reserved.
;

; [BITS 16]               ; Tells the assembler to generate 16 bit code

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; System Calls Lookup
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

; This table contains a lookup of all of the system calls that we expose.
os_print_string             equ 0x03
os_print_line               equ 0x06
os_print_newline            equ 0x09
os_print_char               equ 0x0c
os_print_space              equ 0x0f
os_print_hex_nibble         equ 0x12
os_print_hex_byte           equ 0x15
os_print_hex_word           equ 0x18
os_print_registers          equ 0x1b
os_print_memory             equ 0x1e
os_read_sectors             equ 0x21
os_write_sectors            equ 0x24
os_int_to_string            equ 0x27
os_string_to_int            equ 0x2a
os_print_int                equ 0x2d
os_binary_search            equ 0x30
os_malloc                   equ 0x33
os_free                     equ 0x36
