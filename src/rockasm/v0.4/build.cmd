@echo off
setlocal

pushd .
cd "%~dp0..\..\.."

echo Building RockAsm v0.4
echo =====================
echo.
node tools\rockdisk\bin\rockdisk create-os-floppy --destVfd disks\rockos.vfd --srcDir src --asmVersion v0.4 --osVersion v0.7 --sectorMap src\rockos\v0.7\sectorMap.json

echo Now run the rockos.vfd in a virtual machine to compile the rockasm.rasm file.
pause

echo Copying the assembled file from the floppy disk image...
node tools\rockdisk\bin\rockdisk copy --src disks\rockos.vfd --dest "%~dp0rockasm.bin" --soff 108200h --slen 7000h --trim

echo Done!

popd
endlocal