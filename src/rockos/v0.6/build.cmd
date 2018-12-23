@echo off

pushd .
cd "%~dp0..\..\.."

echo Creating a blank floppy disk image...
node tools\rockdisk\bin\rockdisk create --out disks\rockos.vfd --type floppy

echo Copying the bootloader to the floppy disk image...
node tools\rockdisk\bin\rockdisk copy --src "%~dp0bootload.bin" --dest disks\rockos.vfd --doff 0

echo Copying the kernel to the floppy disk image...
node tools\rockdisk\bin\rockdisk copy --src "%~dp0kernel.bin" --dest disks\rockos.vfd --doff 200h

echo Copying the unit tests to the floppy disk image...
node tools\rockdisk\bin\rockdisk copy --src "%~dp0kernel_test.bin" --dest disks\rockos.vfd --doff 6200h

popd
echo Done
