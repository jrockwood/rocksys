RockOS - Rockwood Operating System
================================================================================

The first version of our journey to a 64-bit modern OS will be a 16-bit
operating system run from the command line and uses less than 1MB of RAM. Its
primary focus will be to handle the hardware and provide basic kernel services
like file system access and memory management.

Memory Map
--------------------------------------------------------------------------------

*Summarized from the [OSDev wiki](http://wiki.osdev.org/Memory_Map_%28x86%29)
and from [a CMU lecture on OSes](http://www.cs.cmu.edu/~410-s07/p4/p4-boot.pdf)*

The following table shows the state of the physical memory when the BIOS jumps
into the bootloader code.

![Memory map](rockos-memory-map.png "Memory map")

We'll use the memory from `0x0000:7E00` to `0x2000:FFFF` for our bootloader and
kernel. The memory map for this section is below, which is 32KB of total memory.

_The address is a half-open range, not including the ending number_

| Address            | Size  | Description                    |
|--------------------|-------|--------------------------------|
| `0x2000:F000-FFFF` | 4 KB  | Stack, growing down in memory  |
| `0x2000:8000-F000` | 28 KB | Space for external programs    |
| `0x2000:7000-8000` | 4 KB  | Kernel disk operation buffer   |
| `0x2000:3000-7000` | 16 KB | Heap                           |
| `0x2000:0000-3000` | 12 KB | Kernel executable code         |

Sector Map
--------------------------------------------------------------------------------

This is a sector map of what is on the floppy disk (each sector on a floppy
drive is 512 bytes).

| Logical Sectors | Address           | Description                     |
|-----------------|-------------------|---------------------------------|
| 0               | `0x00000-0x001FF` | Boot sector                     |
| 1-48            | `0x00200-0x061FF` | Kernel (24K, 48 sectors)        |
| 49-96           | `0x06200-0x0C1FF` | Assembler (24K, 48 sectors)     |
| 97-1072         | `0x0C200-0x861FF` | Source File (500K, 976 sectors) |
| 1073-1121       | `0x86200-0x8C3FF` | Assembled File (written) (24K)  |

Steps
--------------------------------------------------------------------------------

### Version 0.1 - Hello World

This version will simply print out the copyright and version information to the
screen, which lays the foundation for adding additional features. Even doing
that much will validate that we're setting up the segment registers correctly
and using the BIOS interrupts to print strings to the screen.

**Building**

Running `build.bat` will create a blank floppy disk image and then copy our 512
byte bootloader file to the first segment on the floppy disk.

**Setup**

Create a virtual machine in Hyper-V that boots from the floppy drive. All of the
disk images reside in the `disks` directory. The virtual machine only needs the
minimum requirements in terms of processor and memory.

**Running**

Start the virtual machine that you created, which boots from the floppy and you
should see the banner and copyright information printed to the screen. Not much
to see, but a lot is happening behind the scenes.
