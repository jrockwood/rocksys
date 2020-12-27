import * as fsExtra from 'fs-extra';
import * as path from 'path';
import { defaultOsFloppySectorMap, OsFloppySectorMap } from './os-disk';
import { VersionInfo } from './version-info';

export interface AsmAndOsPaths {
  readonly assemblerVersion: VersionInfo;
  readonly assemblerDir: string;
  readonly assemblerBin: string;

  readonly osVersion: VersionInfo;
  readonly osDir: string;
  readonly osBootloadBin: string;
  readonly osKernelBin: string;
}

export function resolveAsmAndOsPaths(
  srcDir: string,
  assemblerVersionString: string,
  osVersionString: string,
): AsmAndOsPaths {
  // parse and verify the versions
  const assemblerVersion = VersionInfo.parse(assemblerVersionString);
  const osVersion = VersionInfo.parse(osVersionString);

  // construct the paths to the assembler files
  const assemblerDir = path.resolve(srcDir, 'rockasm', assemblerVersion.toString());
  const assemblerBin = path.join(assemblerDir, 'rockasm.bin');

  // construct the paths to the OS files
  const osDir = path.resolve(srcDir, 'rockos', osVersion.toString());
  const osBootloadBin = path.join(osDir, 'bootload.bin');
  const osKernelBin = path.join(osDir, 'kernel.bin');

  return {
    assemblerVersion,
    assemblerDir,
    assemblerBin,

    osVersion,
    osDir,
    osBootloadBin,
    osKernelBin,
  };
}

export function parseSectorMapArg(sectorMapJsonFile?: string): OsFloppySectorMap {
  const sectorMap = sectorMapJsonFile ? fsExtra.readJsonSync(sectorMapJsonFile) : defaultOsFloppySectorMap;
  return sectorMap;
}
