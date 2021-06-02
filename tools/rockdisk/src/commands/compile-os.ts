import * as colors from 'colors';
import * as path from 'path';
import * as yargs from 'yargs';
import { compileOs, CompileOsOptions, defaultOsFloppySectorMap } from '../os-disk';
import { parseSectorMapArg, resolveAsmAndOsPaths } from '../parse-args';

const epilog =
  'Assumes that there is a source directory with the following format:\n' +
  '    <src>/rockasm/v<x.y> and <src>/rockos/v<x.y>\n\n' +
  'If sectorMap is provided it takes the following JSON format:\n' +
  `${JSON.stringify(defaultOsFloppySectorMap, undefined, '  ')}\n`;

export const command = 'compile-os';
export const describe = 'Compiles the bootstrap and kernel source files';
export const builder = (argv: yargs.Argv): yargs.Argv<RawArgs> => {
  return argv
    .usage(`Usage: rockdisk ${command} --destVfd <path> --srcDir <path> --asmVersion <v> --osVersion <v> [options]`)
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

export const handler = async (argv: yargs.Arguments<RawArgs>): Promise<void> => {
  const options: CompileOsOptions = resolveOptions(argv);
  const succeeded = await compileOs(options);
  if (succeeded) {
    console.log(
      colors.green(
        `Compiled bootstrap, kernel, and kernel tests successfully into '${options.bootloadBinDestinationFile}', ` +
          `'${options.kernelBinDestinationFile}', and '${options.kernelUnitTestBinFile}' respectively.`,
      ),
    );
    process.exit(0);
  } else {
    console.log(colors.red('Build failed'));
    process.exit(1);
  }
};

interface RawArgs {
  destVfd: string;
  srcDir: string;
  asmVersion: string;
  osVersion: string;
  sectorMap?: string;
}

/**
 * Parses the arguments specific to the 'buildos' command. Exposed mainly for unit tests.
 */
export function parseArgs(args: string[]): CompileOsOptions {
  if (args.length === 0 || args[0] !== 'compile-os') {
    args = ['compile-os'].concat(args);
  }

  const parsedArgs = yargs(args)
    .command(command, describe, builder)
    .fail((msg: string) => {
      throw new Error(msg);
    })
    .parseSync();

  return resolveOptions(parsedArgs);
}

function resolveOptions(parsedArgs: yargs.Arguments<RawArgs>): CompileOsOptions {
  const destinationFloppyImage: string = path.resolve(parsedArgs.destVfd);
  const paths = resolveAsmAndOsPaths(parsedArgs.srcDir, parsedArgs.asmVersion, parsedArgs.osVersion);

  const bootloadSourceFile = path.resolve(paths.osDir, 'bootload.rasm');
  const kernelSourceFile = path.resolve(paths.osDir, 'kernel.rasm');
  const kernelUnitTestSourceFile = path.resolve(paths.osDir, 'kernel_test.rasm');
  const kernelUnitTestBinFile = path.resolve(paths.osDir, 'kernel_test.bin');

  const sectorMap = parseSectorMapArg(parsedArgs.sectorMap);

  return {
    destinationFloppyImage,
    assemblerBinFile: paths.assemblerBin,
    assemblerVersion: paths.assemblerVersion.toString(),

    bootloadSourceFile,
    kernelSourceFile,
    kernelUnitTestSourceFile,

    bootloadBinDestinationFile: paths.osBootloadBin,
    kernelBinDestinationFile: paths.osKernelBin,
    kernelUnitTestBinFile,

    sectorMap,
  };
}
