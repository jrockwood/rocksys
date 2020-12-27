@echo off
setlocal

pushd .
cd "%~dp0..\..\.."

echo Creating a blank floppy disk image...
node tools\rockdisk\bin\rockdisk create --out disks\rockos.vfd --type floppy

echo Copying the bootloader to the floppy disk image...
node tools\rockdisk\bin\rockdisk copy --src src\rockos\v0.7\bootload.bin --dest disks\rockos.vfd --doff 0

echo Copying the kernel to the floppy disk image...
node tools\rockdisk\bin\rockdisk copy --src src\rockos\v0.7\kernel.bin --dest disks\rockos.vfd --doff 200h

echo Copying the assembler to the floppy disk image...
node tools\rockdisk\bin\rockdisk copy --src "%~dp0rockasm.bin" --dest disks\rockos.vfd --doff 7200h

echo Copying the source file to the floppy disk image...
node tools\rockdisk\bin\rockdisk copy --src "%~dp0rockasm.rasm" --dest disks\rockos.vfd --doff E200h

echo Now run the rockos.vfd in a virtual machine to compile the assembler...
pause

echo Copying the assembled file from the floppy disk image...
node tools\rockdisk\bin\rockdisk copy --src disks\rockos.vfd --dest "%~dp0rockasm.bin" --soff 108200h --slen 7000h --trim

popd
echo Done

endlocal
