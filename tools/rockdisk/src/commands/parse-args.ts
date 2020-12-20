import * as fsExtra from 'fs-extra';
import * as path from 'path';
import { defaultOsFloppySectorMap, OsFloppySectorMap } from '../os-disk';

/**
 * Represents a major.minor version.
 */
export class VersionInfo {
  public readonly major: number;
  public readonly minor: number;

  public constructor(major: number, minor: number) {
    this.major = major;
    this.minor = minor;
  }

  /**
   * Parses the version string into a major/minor pair.
   * @param versionString A version string in the form 'vX.Y'
   */
  public static parse(versionString: string): VersionInfo {
    const versionRegEx = /v(?<major>\d+)\.(?<minor>\d+)/;
    const groups = versionString.match(versionRegEx)?.groups;
    if (!groups) {
      throw new Error(`Version is not in a correct format: '${versionString}'`);
    }

    const major = parseInt(groups.major, 10);
    const minor = parseInt(groups.minor, 10);

    return new VersionInfo(major, minor);
  }

  public toString(): string {
    return `v${this.major}.${this.minor}`;
  }
}

export interface AsmAndOsPaths {
  readonly assemblerVersion: VersionInfo;
  readonly assemblerDir: string;
  readonly assemblerBin: string;

  readonly previousAssemblerVersion: VersionInfo;
  readonly previousAssemblerDir: string;
  readonly previousAssemblerBin: string;

  readonly osVersion: VersionInfo;
  readonly osDir: string;
  readonly osBootloadBin: string;
  readonly osKernelBin: string;

  readonly previousOsVersion: VersionInfo;
  readonly previousOsDir: string;
  readonly previousOsBootloadBin: string;
  readonly previousOsKernelBin: string;
}

export function resolveAsmAndOsPaths(
  srcDir: string,
  assemblerVersionString: string,
  osVersionString: string,
): AsmAndOsPaths {
  // parse and verify the versions
  const assemblerVersion = VersionInfo.parse(assemblerVersionString);
  const osVersion = VersionInfo.parse(osVersionString);

  if (assemblerVersion.minor === 0) {
    throw new Error(
      `Cannot determine the previous version of the assembler using version '${assemblerVersionString}'.`,
    );
  }

  if (osVersion.minor === 0) {
    throw new Error(`Cannot determine the previous version of the OS using version '${osVersionString}'.`);
  }

  const previousAssemblerVersion = new VersionInfo(assemblerVersion.major, assemblerVersion.minor - 1);
  const previousOsVersion = new VersionInfo(osVersion.major, osVersion.minor - 1);

  // construct the paths to the assembler files
  const assemblerDir = path.resolve(srcDir, 'rockasm', assemblerVersion.toString());
  const assemblerBin = path.join(assemblerDir, 'rockasm.bin');
  const previousAssemblerDir = path.resolve(srcDir, 'rockasm', previousAssemblerVersion.toString());
  const previousAssemblerBin = path.join(previousAssemblerDir, 'rockasm.bin');

  // construct the paths to the OS files
  const osDir = path.resolve(srcDir, 'rockos', osVersion.toString());
  const osBootloadBin = path.join(osDir, 'bootload.bin');
  const osKernelBin = path.join(osDir, 'kernel.bin');

  const previousOsDir = path.resolve(srcDir, 'rockos', previousOsVersion.toString());
  const previousOsBootloadBin = path.join(previousOsDir, 'bootload.bin');
  const previousOsKernelBin = path.join(previousOsDir, 'kernel.bin');

  return {
    assemblerVersion,
    assemblerDir,
    assemblerBin,

    previousAssemblerVersion,
    previousAssemblerDir,
    previousAssemblerBin,

    osVersion,
    osDir,
    osBootloadBin,
    osKernelBin,

    previousOsVersion,
    previousOsDir,
    previousOsBootloadBin,
    previousOsKernelBin,
  };
}

export function parseSectorMapArg(sectorMapJsonFile?: string): OsFloppySectorMap {
  const sectorMap = sectorMapJsonFile ? fsExtra.readJsonSync(sectorMapJsonFile) : defaultOsFloppySectorMap;
  return sectorMap;
}
