@echo off

pushd .
cd "%~dp0..\..\.."

echo Creating a blank floppy disk image...
node tools\rockdisk\bin\rockdisk create --out disks\rockos.vfd --type floppy

echo Copying the bootloader to the floppy disk image...
node tools\rockdisk\bin\rockdisk copy --src src\rockos\v0.3\bootload.bin --dest disks\rockos.vfd --doff 0

echo Copying the kernel to the floppy disk image...
node tools\rockdisk\bin\rockdisk copy --src src\rockos\v0.3\kernel.bin --dest disks\rockos.vfd --doff 200h

echo Copying the assembler to the floppy disk image...
node tools\rockdisk\bin\rockdisk copy --src src\rockasm\v0.1\rockasm.bin --dest disks\rockos.vfd --doff 800h

popd
echo Done
