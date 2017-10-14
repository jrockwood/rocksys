@echo off

pushd .
cd %~dp0..\..\..\

echo Creating a blank floppy disk image...
node tools\rockdisk\bin\rockdisk create --out disks\rockos.vfd --type floppy

echo Copying the bootloader to the floppy disk image...
node tools\rockdisk\bin\rockdisk copy --src "%~dp0bootload.bin" --dest disks\rockos.vfd --doff 0

popd
echo Done
