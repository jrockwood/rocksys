import * as colors from 'colors';
import * as path from 'path';
import * as yargs from 'yargs';
import { BootableOsFloppyOptions, createBootableOsFloppy, defaultOsFloppySectorMap } from '../os-disk';
import { parseSectorMapArg, resolveAsmAndOsPaths } from '../parse-args';

const epilog =
  'Assumes that there is a source directory with the following format:\n' +
  '    <src>/rockasm/v<x.y> and <src>/rockos/v<x.y>\n\n' +
  'If sectorMap is provided it takes the following JSON format:\n' +
  `${JSON.stringify(defaultOsFloppySectorMap, undefined, '  ')}\n`;

export const command = 'create-os-floppy';
export const describe = 'Creates a virtual floppy disk loaded with the OS and assembler';
export const builder = (argv: yargs.Argv): yargs.Argv<RawArgs> => {
  return argv
    .usage(
      `Usage: rockdisk ${command} --destVfd <path> --srcDir <path> --srcFile <path> --asmVersion <v> --osVersion <v> [options]`,
    )
    .option('destVfd', {
      alias: 'd',
      describe: 'Destination floppy virtual disk image',
      requiresArg: true,
      type: 'string',
      demandOption: true,
      normalize: true,
    })
    .option('srcDir', {
      alias: 's',
      describe: "Source directory which contains 'rockasm' and 'rockos' subdirectories",
      requiresArg: true,
      type: 'string',
      demandOption: true,
      normalize: true,
    })
    .option('srcFile', {
      describe: 'Source file to compile',
      requiresArg: true,
      type: 'string',
      demandOption: true,
      normalize: true,
    })
    .option('asmVersion', {
      describe: "Assembly version (in the form 'vX.Y')",
      requiresArg: true,
      type: 'string',
      demandOption: true,
    })
    .option('osVersion', {
      describe: "Version of the OS to compile (in the form 'vX.Y')",
      requiresArg: true,
      type: 'string',
      demandOption: true,
    })
    .option('sectorMap', {
      describe: 'JSON file of the sector map for the floppy disk',
      requiresArg: true,
      type: 'string',
    })
    .strict()
    .epilog(epilog);
};

export const handler = (argv: yargs.Arguments<RawArgs>): void => {
  const resolvedOptions: BootableOsFloppyOptions = resolveOptions(argv);
  createBootableOsFloppy(resolvedOptions);
  console.log(colors.green(`Created OS disk at '${resolvedOptions.destinationFloppyImage}'.`));
};

interface RawArgs {
  destVfd: string;
  srcDir: string;
  srcFile: string;
  asmVersion: string;
  osVersion: string;
  sectorMap?: string;
}

/**
 * Parses the arguments specific to the command. Exposed mainly for unit tests.
 */
export function parseArgs(args: string[]): BootableOsFloppyOptions {
  if (args.length === 0 || args[0] !== command) {
    args = [command].concat(args);
  }

  const parsedArgs = yargs(args)
    .command(command, describe, builder)
    .fail((msg: string) => {
      throw new Error(msg);
    }).argv;

  return resolveOptions(parsedArgs);
}

function resolveOptions(parsedArgs: yargs.Arguments<RawArgs>): BootableOsFloppyOptions {
  const destinationFloppyImage: string = path.resolve(parsedArgs.destVfd);
  const paths = resolveAsmAndOsPaths(parsedArgs.srcDir, parsedArgs.asmVersion, parsedArgs.osVersion);
  const sourceFileToCompile = path.resolve(parsedArgs.srcFile);
  const sectorMap = parseSectorMapArg(parsedArgs.sectorMap);
  return {
    destinationFloppyImage,
    bootloadBinFile: paths.osBootloadBin,
    kernelBinFile: paths.osKernelBin,
    assemblerBinFile: paths.assemblerBin,
    sourceFileToCompile,
    sectorMap,
  };
}
