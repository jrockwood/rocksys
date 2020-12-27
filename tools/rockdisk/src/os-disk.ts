import * as fsExtra from 'fs-extra';
import * as path from 'path';
import {
  copyBlock,
  createBlankDisk,
  DiskSectorRange,
  FloppyDiskSectorRange,
  floppySize,
  trimTrailingZerosAndAlignTo16ByteBoundary,
} from './disk';
import { DefaultPrompter, Prompter } from './prompter';

export const sectorsFor28K = 56;
export const sectorsFor1MB = 2000;

/**
 * This is a sector map of what is on the floppy disk (each sector on a floppy
 * drive is 512 bytes).
 *
 * | Logical Sectors | Address             | Description                     |
 * | --------------- | ------------------- | ------------------------------- |
 * | 0               | `0x000000-0x0001FF` | Boot sector                     |
 * | 1-56            | `0x000200-0x0071FF` | Kernel (28K, 56 sectors)        |
 * | 57-112          | `0x007200-0x00E1FF` | Assembler (28K, 56 sectors)     |
 * | 113-2112        | `0x00E200-0x1081FF` | Source File (1MB, 2000 sectors) |
 * | 2113-2168       | `0x108200-0x10F1FF` | Assembled File (written) (28K)  |
 */
export class OsFloppySectorMap {
  public readonly bootSector: FloppyDiskSectorRange;
  public readonly kernelSector: FloppyDiskSectorRange;
  public readonly assemblerSector: FloppyDiskSectorRange;
  public readonly sourceFileSector: FloppyDiskSectorRange;
  public readonly assembledFileSector: FloppyDiskSectorRange;

  public constructor(
    kernelSector?: FloppyDiskSectorRange,
    assemblerSector?: FloppyDiskSectorRange,
    sourceFileSector?: FloppyDiskSectorRange,
    assembledFileSector?: FloppyDiskSectorRange,
  ) {
    this.bootSector = new FloppyDiskSectorRange(0, 1);
    this.kernelSector = kernelSector || new FloppyDiskSectorRange(1, sectorsFor28K);
    this.assemblerSector = assemblerSector || new FloppyDiskSectorRange(this.kernelSector.endSector + 1, sectorsFor28K);

    this.sourceFileSector =
      sourceFileSector || new FloppyDiskSectorRange(this.assemblerSector.endSector + 1, sectorsFor1MB);

    this.assembledFileSector =
      assembledFileSector || new FloppyDiskSectorRange(this.sourceFileSector.endSector + 1, sectorsFor28K);
  }
}

export const defaultOsFloppySectorMap = new OsFloppySectorMap();

export interface BootableOsFloppyOptions {
  /** The destination floppy disk image. */
  destinationFloppyImage: string;

  /** Path to the booload.bin file to use. */
  bootloadBinFile: string;

  /** Path to the kernel.bin file to use. */
  kernelBinFile: string;

  /** The rockasm.bin file to copy to the floppy disk image. */
  assemblerBinFile: string;

  /** Path to the source file to compile. */
  sourceFileToCompile: string;

  /**
   * A sector map describing where each section of the OS resides on the floppy disk.
   */
  sectorMap: OsFloppySectorMap;
}

/**
 * Copies the different pieces that make up the RockOS/RockAsm floppy disk image.
 * @param destinationFile The destination floppy disk image.
 * @param bootloadBinFile The bootstrap.bin file to copy to the floppy disk image.
 * @param kernelBinFile The kernel.bin file to copy to the floppy disk image.
 * @param assemblerBinFile The rockasm.bin file to copy to the floppy disk image.
 * @param sourceFileToCompile The source .rasm file to copy to the floppy disk image, which will be compiled by the assembler.
 * @param sectorMap An optional sector map describing where each section of the OS resides on the floppy disk.
 */
export function createBootableOsFloppy(options: BootableOsFloppyOptions): void {
  createBlankDisk(options.destinationFloppyImage, floppySize);

  // copy the parts to the right place on disk
  copyDiskPart(options.destinationFloppyImage, options.bootloadBinFile, options.sectorMap.bootSector);
  copyDiskPart(options.destinationFloppyImage, options.kernelBinFile, options.sectorMap.kernelSector);
  copyDiskPart(options.destinationFloppyImage, options.assemblerBinFile, options.sectorMap.assemblerSector);
  copyDiskPart(options.destinationFloppyImage, options.sourceFileToCompile, options.sectorMap.sourceFileSector);
}

function copyDiskPart(destinationFile: string, sourceBinFile: string, sectorRange: DiskSectorRange): void {
  // make sure the size of the source binary file is not bigger than the maximum size
  const maxSize = sectorRange.totalBytes;
  const stats = fsExtra.statSync(sourceBinFile);
  if (stats.size > maxSize) {
    throw new Error(`The size of '${sourceBinFile}' exceeds the maximum size of ${maxSize}.`);
  }

  // copy the source to the destination
  const destOffset = sectorRange.startAddress;
  copyBlock(sourceBinFile, destinationFile, /*sourceOffset:*/ 0, maxSize, destOffset);
}

export interface CompileOsOptions {
  /** The destination floppy disk image. */
  destinationFloppyImage: string;

  /** The rockasm.bin file to copy to the floppy disk image. */
  assemblerBinFile: string;

  /** The version of the assembler being used to compile. */
  assemblerVersion: string;

  bootloadSourceFile: string;
  kernelSourceFile: string;
  kernelUnitTestSourceFile: string;

  bootloadBinDestinationFile: string;
  kernelBinDestinationFile: string;
  kernelUnitTestBinFile: string;

  /**
   * An optional sector map describing where each section of the OS resides on the floppy disk.
   */
  sectorMap?: OsFloppySectorMap;
}

export async function compileOs(options: CompileOsOptions, prompter: Prompter = DefaultPrompter): Promise<boolean> {
  const sectorMap = options.sectorMap || defaultOsFloppySectorMap;

  // Compile Bootloader
  // ------------------

  prompter.report(`Compiling the bootloader using RockAsm ${options.assemblerVersion}...`);
  createBootableOsFloppy({
    destinationFloppyImage: options.destinationFloppyImage,
    bootloadBinFile: options.bootloadBinDestinationFile,
    kernelBinFile: options.kernelBinDestinationFile,
    assemblerBinFile: options.assemblerBinFile,
    sourceFileToCompile: options.bootloadSourceFile,
    sectorMap,
  });

  prompter.report(
    `Now run the ${path.basename(options.destinationFloppyImage)} in a virtual machine to compile the ${path.basename(
      options.bootloadSourceFile,
    )} file.`,
  );
  let succeeded = await prompter.promptYesNo('Did the compile succeed?');
  if (!succeeded) {
    prompter.reportError('Exiting early');
    return false;
  }

  extractAndTrimCompiledFile(options.destinationFloppyImage, options.bootloadBinDestinationFile, sectorMap);

  // Compile Kernel
  // --------------

  prompter.report(`Compiling the kernel using RockAsm ${options.assemblerVersion}...`);
  createBootableOsFloppy({
    destinationFloppyImage: options.destinationFloppyImage,
    bootloadBinFile: options.bootloadBinDestinationFile,
    kernelBinFile: options.kernelBinDestinationFile,
    assemblerBinFile: options.assemblerBinFile,
    sourceFileToCompile: options.kernelSourceFile,
    sectorMap,
  });

  prompter.report(
    `Now run the ${path.basename(options.destinationFloppyImage)} in a virtual machine to compile the ${path.basename(
      options.kernelSourceFile,
    )} file.`,
  );
  succeeded = await prompter.promptYesNo('Did the compile succeed?');
  if (!succeeded) {
    prompter.reportError('Exiting early');
    return false;
  }

  extractAndTrimCompiledFile(options.destinationFloppyImage, options.kernelBinDestinationFile, sectorMap);

  // Compile Kernel Tests
  // --------------------

  prompter.report(`Compiling the kernel tests using RockAsm ${options.assemblerVersion}...`);
  createBootableOsFloppy({
    destinationFloppyImage: options.destinationFloppyImage,
    bootloadBinFile: options.bootloadBinDestinationFile,
    kernelBinFile: options.kernelBinDestinationFile,
    assemblerBinFile: options.assemblerBinFile,
    sourceFileToCompile: options.kernelUnitTestSourceFile,
    sectorMap,
  });

  prompter.report(
    `Now run the ${path.basename(options.destinationFloppyImage)} in a virtual machine to compile the ${path.basename(
      options.kernelUnitTestSourceFile,
    )} file.`,
  );
  succeeded = await prompter.promptYesNo('Did the compile succeed?');
  if (!succeeded) {
    prompter.reportError('Exiting early');
    return false;
  }

  extractAndTrimCompiledFile(options.destinationFloppyImage, options.kernelUnitTestBinFile, sectorMap);

  // Create floppy disk with the kernel_test ready to run
  // ----------------------------------------------------

  prompter.report(`Creating a floppy disk with the ${path.basename(options.kernelUnitTestBinFile)} ready to run...`);
  createBootableOsFloppy({
    destinationFloppyImage: options.destinationFloppyImage,
    bootloadBinFile: options.bootloadBinDestinationFile,
    kernelBinFile: options.kernelBinDestinationFile,
    assemblerBinFile: options.kernelUnitTestBinFile,
    sourceFileToCompile: options.kernelUnitTestSourceFile,
    sectorMap,
  });

  succeeded = await prompter.promptYesNo('Did the tests succeed?');
  if (!succeeded) {
    prompter.reportError('Exiting early');
    return false;
  }

  return true;
}

function extractAndTrimCompiledFile(
  sourceFloppyImage: string,
  destinationBinFile: string,
  sectorMap: OsFloppySectorMap,
): void {
  const compiledFileOffset = sectorMap.assembledFileSector.startAddress;
  const maxLength = sectorMap.assembledFileSector.totalBytes;
  copyBlock(sourceFloppyImage, destinationBinFile, compiledFileOffset, maxLength);
  trimTrailingZerosAndAlignTo16ByteBoundary(destinationBinFile);
}
