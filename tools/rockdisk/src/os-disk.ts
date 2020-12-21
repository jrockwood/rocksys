import * as fsExtra from 'fs-extra';
import * as path from 'path';
import {
  copyBlock,
  createBlankDisk,
  floppyBytesPerSector,
  floppySize,
  trimTrailingZerosAndAlignTo16ByteBoundary,
} from './disk';
import { DefaultPrompter, Prompter } from './prompter';

export interface OsFloppySectorMap {
  readonly bootSector: number;

  readonly kernelSector: number;
  readonly kernelSizeInSectors: number;

  readonly assemblerSector: number;
  readonly assemblerSizeInSectors: number;

  readonly sourceFileSector: number;
  readonly sourceFileSizeInSectors: number;

  readonly assembledFileSector: number;
  readonly assembledFileSizeInSectors: number;
}

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
export const defaultOsFloppySectorMap: OsFloppySectorMap = {
  bootSector: 0,
  kernelSector: 1,
  kernelSizeInSectors: sectorsFor28K,

  assemblerSector: sectorsFor28K + 1,
  assembledFileSizeInSectors: sectorsFor28K,

  sourceFileSector: sectorsFor28K * 2 + 1,
  sourceFileSizeInSectors: sectorsFor1MB,

  assembledFileSector: sectorsFor28K * 2 + sectorsFor1MB + 1,
  assemblerSizeInSectors: sectorsFor28K,
};

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
   * An optional sector map describing where each section of the OS resides on the floppy disk.
   */
  sectorMap?: OsFloppySectorMap;
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

  const sectorMap = options.sectorMap || defaultOsFloppySectorMap;

  // copy the parts to the right place on disk
  copyDiskPart(options.destinationFloppyImage, options.bootloadBinFile, sectorMap.bootSector, 1);
  copyDiskPart(
    options.destinationFloppyImage,
    options.kernelBinFile,
    sectorMap.kernelSector,
    sectorMap.kernelSizeInSectors,
  );
  copyDiskPart(
    options.destinationFloppyImage,
    options.assemblerBinFile,
    sectorMap.assemblerSector,
    sectorMap.assemblerSizeInSectors,
  );
  copyDiskPart(
    options.destinationFloppyImage,
    options.sourceFileToCompile,
    sectorMap.sourceFileSector,
    sectorMap.sourceFileSizeInSectors,
  );
}

function copyDiskPart(destinationFile: string, sourceBinFile: string, sectorStart: number, maxSectors: number): void {
  // make sure the size of the source binary file is not bigger than the maximum size
  const maxSize = maxSectors * floppyBytesPerSector;
  const stats = fsExtra.statSync(sourceBinFile);
  if (stats.size > maxSize) {
    throw new Error(`The size of '${sourceBinFile}' exceeds the maximum size of ${maxSize}.`);
  }

  // copy the source to the destination
  const destOffset = sectorStart * floppyBytesPerSector;
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
  const compiledFileOffset = sectorMap.assembledFileSector * floppyBytesPerSector;
  const maxLength = sectorMap.assembledFileSizeInSectors * floppyBytesPerSector;
  copyBlock(sourceFloppyImage, destinationBinFile, compiledFileOffset, maxLength);
  trimTrailingZerosAndAlignTo16ByteBoundary(destinationBinFile);
}
