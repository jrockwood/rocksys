@echo off
setlocal

pushd .
cd "%~dp0..\..\.."

echo Compiling v0.7 kernel...
node tools\rockdisk\bin\rockdisk create --destVfd disks\rockos.vfd --type floppy
node tools\rockdisk\bin\rockdisk copy --dest disks\rockos.vfd --src src\rockos\v0.6\bootload.bin --doff 0
node tools\rockdisk\bin\rockdisk copy --dest disks\rockos.vfd --src src\rockos\v0.6\kernel.bin --doff 512
node tools\rockdisk\bin\rockdisk copy --dest disks\rockos.vfd --src src\rockasm\v0.3\rockasm.bin --doff
node tools\rockdisk\bin\rockdisk copy --dest disks\rockos.vfd --src "%~dp0kernel.rasm" --doff

echo Done!

popd
endlocal
