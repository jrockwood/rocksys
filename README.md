RockSys
================================================================================
> Rockwood assembler, compilers, and operating system

It's always been a goal of mine to start from scratch and build a complete
software computing system, starting with just the Intel-based hardware
(implementing the hardware is another goal). It's one of those life-long
projects that may never come to fruition, but it's fun and I learn a lot in the
process.

Let's start with the end in mind and then move backwards to what we need to
implement. The end-goal is to be able to play a basic game using the mouse and
keyboard in a graphical user interface, something like Tetris.

Operating System Stages
--------------------------------------------------------------------------------

Writing an operating system is a complex task, but we can start simple and build
up in stages. We'll follow much the same path that computing history did:

1) **Command-line OS** A basic disk operating system that runs in 16-bits and
   uses less than 1MB of RAM. Its primary focus will be to handle the hardware
   and provide basic kernel services like file system access and memory
   management.

2) **Graphical OS** Adding a text-based GUI on top of the OS using ASCII art. We
   may decide to skip this step.

3) **32-bit OS** Allow the OS to use up to 4GB of RAM and add
   protection/privilege rings. We may add the concept of basic device drivers as
   well.

4) **64-bit OS** With all of the modern concepts in today's OSes. I probably
   won't get this far. :)

Prerequisites for building an OS
--------------------------------------------------------------------------------

In order to create applications that will run on the OS, in this case Tetris, we
really need a high-level language like C#, Java, or Swift. Typically, those
languages are written (or at least bootstrapped) using something like C++. To
write a C++ compiler, we'll need a C compiler, which needs an assembler.

`assembler --> C --> C++ --> C#`

### Where do we start?

Remember that the only thing we have available to us is the bare hardware, so
the first thing we'll need is a rudimentary operating system, just enough to run
an assembler.

In the good old days, you could program the computer with a series of hardware
switches and then punch cards to write programs. We won't start that basic, so
we'll "allow" the following tools:

* A text editor
* A binary hex editor
* A floppy drive
* An emulator so we don't have to keep rebooting the machine. We'll be using
  Hyper-V on Windows 10, since it's free and I'm using Windows as my primary
  machine. Linux or Macs would be just as easy (actually, probably easier) since
  they both have everything we need also.

So how do you write an assembler without having anything else? You have to
bootstrap it. See the [Rockwood Assembly](docs/rockasm.md) documentation for
details on how we do that.

Before we can run an assembler, though, we need a basic boot loader. See the
[Rockwood OS](docs/rockos.md) file for more information.

## License

[Apache 2.0](http://www.apache.org/licenses/LICENSE-2.0)
