@echo off

pushd .
cd "%~dp0..\..\.."

echo Creating a blank floppy disk image...
node tools\rockdisk\bin\rockdisk create --out disks\rockos.vfd --type floppy

echo Copying the bootloader to the floppy disk image...
node tools\rockdisk\bin\rockdisk copy --src src\rockos\v0.5\bootload.bin --dest disks\rockos.vfd --doff 0

echo Copying the kernel to the floppy disk image...
node tools\rockdisk\bin\rockdisk copy --src src\rockos\v0.5\kernel.bin --dest disks\rockos.vfd --doff 200h

echo Copying the assembler to the floppy disk image...
node tools\rockdisk\bin\rockdisk copy --src "%~dp0rockasm.bin" --dest disks\rockos.vfd --doff 6200h

echo Copying the source file to the floppy disk image...
node tools\rockdisk\bin\rockdisk copy --src "%~dp0rockasm.rasm" --dest disks\rockos.vfd --doff C200h

popd
echo Done
