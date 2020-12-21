@echo off
setlocal

pushd .
cd "%~dp0..\..\.."

echo Building RockOS v0.7
echo ====================
echo.
node tools\rockdisk\bin\rockdisk compile-os --destVfd disks\rockos.vfd --srcDir src --asmVersion v0.4 --osVersion v0.7 --sectorMap "%~dp0sectorMap.json"

echo Done!

popd
endlocal
