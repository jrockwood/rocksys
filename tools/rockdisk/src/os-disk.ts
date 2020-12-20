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

export const sectorsFor24K = 48;
export const sectorsFor500K = 976;

/**
 * This is a sector map of what is on the floppy disk (each sector on a floppy
 * drive is 512 bytes).
 *
 * | Logical Sectors | Address           | Description                     |
 * | --------------- | ----------------- | ------------------------------- |
 * | 0               | `0x00000-0x001FF` | Boot sector                     |
 * | 1-48            | `0x00200-0x061FF` | Kernel (24K, 48 sectors)        |
 * | 49-96           | `0x06200-0x0C1FF` | Assembler (24K, 48 sectors)     |
 * | 97-1072         | `0x0C200-0x861FF` | Source File (500K, 976 sectors) |
 * | 1073-1121       | `0x86200-0x8C3FF` | Assembled File (written) (24K)  |
 */
export const defaultOsFloppySectorMap: OsFloppySectorMap = {
  bootSector: 0,
  kernelSector: 1,
  kernelSizeInSectors: sectorsFor24K,

  assemblerSector: sectorsFor24K + 1,
  assembledFileSizeInSectors: sectorsFor24K,

  sourceFileSector: sectorsFor24K * 2 + 1,
  sourceFileSizeInSectors: sectorsFor500K,

  assembledFileSector: sectorsFor24K * 2 + sectorsFor500K + 1,
  assemblerSizeInSectors: sectorsFor24K,
};

/**
 * Copies the different pieces that make up the RockOS/RockAsm floppy disk image.
 * @param destinationFile The destination floppy disk image.
 * @param bootloadBinFile The bootstrap.bin file to copy to the floppy disk image.
 * @param kernelBinFile The kernel.bin file to copy to the floppy disk image.
 * @param assemblerBinFile The rockasm.bin file to copy to the floppy disk image.
 * @param sourceFileToCompile The source .rasm file to copy to the floppy disk image, which will be compiled by the assembler.
 * @param sectorMap An optional sector map describing where each section of the OS resides on the floppy disk.
 */
export function createBootableOsFloppy(
  destinationFile: string,
  bootloadBinFile: string,
  kernelBinFile: string,
  assemblerBinFile: string,
  sourceFileToCompile: string,
  sectorMap: OsFloppySectorMap = defaultOsFloppySectorMap,
): void {
  createBlankDisk(destinationFile, floppySize);

  // copy the parts to the right place on disk
  copyDiskPart(destinationFile, bootloadBinFile, sectorMap.bootSector, 1);
  copyDiskPart(destinationFile, kernelBinFile, sectorMap.kernelSector, sectorMap.kernelSizeInSectors);
  copyDiskPart(destinationFile, assemblerBinFile, sectorMap.assemblerSector, sectorMap.assemblerSizeInSectors);
  copyDiskPart(destinationFile, sourceFileToCompile, sectorMap.sourceFileSector, sectorMap.sourceFileSizeInSectors);
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
  destinationFloppyImage: string;

  assemblerBinFile: string;
  assemblerVersion: string;

  previousVersionBootloadBinFile: string;
  previousVersionKernelBinFile: string;

  bootloadSourceFile: string;
  kernelSourceFile: string;
  kernelUnitTestSourceFile: string;

  bootloadBinDestinationFile: string;
  kernelBinDestinationFile: string;
  kernelUnitTestBinFile: string;

  sectorMap?: OsFloppySectorMap;
}

export async function compileOs(options: CompileOsOptions, prompter: Prompter = DefaultPrompter): Promise<boolean> {
  const sectorMap = options.sectorMap || defaultOsFloppySectorMap;

  // Compile Bootloader
  // ------------------

  prompter.report(`Compiling the bootloader using RockAsm ${options.assemblerVersion}...`);
  createBootableOsFloppy(
    options.destinationFloppyImage,
    options.previousVersionBootloadBinFile,
    options.previousVersionKernelBinFile,
    options.assemblerBinFile,
    options.bootloadSourceFile,
    sectorMap,
  );

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
  createBootableOsFloppy(
    options.destinationFloppyImage,
    options.bootloadBinDestinationFile,
    options.previousVersionKernelBinFile,
    options.assemblerBinFile,
    options.kernelSourceFile,
    sectorMap,
  );

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
  createBootableOsFloppy(
    options.destinationFloppyImage,
    options.bootloadBinDestinationFile,
    options.kernelBinDestinationFile,
    options.assemblerBinFile,
    options.kernelUnitTestSourceFile,
    sectorMap,
  );

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
  createBootableOsFloppy(
    options.destinationFloppyImage,
    options.bootloadBinDestinationFile,
    options.kernelBinDestinationFile,
    options.kernelUnitTestBinFile,
    options.kernelUnitTestSourceFile,
    sectorMap,
  );

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
