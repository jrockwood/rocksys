@echo off

pushd .
cd "%~dp0..\..\.."

echo Copying the assembled file from the floppy disk image...
node tools\rockdisk\bin\rockdisk copy --src disks\rockos.vfd --dest "%~dp0assembled.bin" --soff 86200h --slen 6000h

popd
echo Done
