import * as colors from 'colors';
import * as fsExtra from 'fs-extra';
import * as path from 'path';
import * as yargs from 'yargs';
import { compileOs, CompileOsOptions, defaultOsFloppySectorMap } from '../os-disk';

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
  srcDir: string;
  destVfd: string;
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
    }).argv;

  return resolveOptions(parsedArgs);
}

function resolveOptions(parsedArgs: yargs.Arguments<RawArgs>): CompileOsOptions {
  const destinationFloppyImage: string = path.resolve(parsedArgs.destVfd);
  const assemblerBinFile = path.resolve(parsedArgs.srcDir, 'rockasm', parsedArgs.asmVersion, 'rockasm.bin');
  const assemblerVersion = parsedArgs.asmVersion;

  // parse the osVersion into major.minor
  const versionRegEx = /v(?<major>\d+)\.(?<minor>\d+)/;
  const groups = parsedArgs.osVersion.match(versionRegEx)?.groups;
  if (!groups) {
    throw new Error(`osVersion is not in a correct format: '${parsedArgs.osVersion}'`);
  }

  const osVersionMajor = parseInt(groups.major, 10);
  const osVersionMinor = parseInt(groups.minor, 10);

  // construct the paths to the various files
  const previousOsVersionDir = path.resolve(
    parsedArgs.srcDir,
    'rockos',
    `v${Math.max(0, osVersionMajor - 1)}.${osVersionMinor - 1}`,
  );
  const previousVersionBootloadBinFile = path.resolve(previousOsVersionDir, 'bootload.bin');
  const previousVersionKernelBinFile = path.resolve(previousOsVersionDir, 'kernel.bin');

  const osDir = path.resolve(parsedArgs.srcDir, 'rockos', parsedArgs.osVersion);
  const bootloadSourceFile = path.resolve(osDir, 'bootload.rasm');
  const kernelSourceFile = path.resolve(osDir, 'kernel.rasm');
  const kernelUnitTestSourceFile = path.resolve(osDir, 'kernel_test.rasm');

  const bootloadBinDestinationFile = path.resolve(osDir, 'bootload.bin');
  const kernelBinDestinationFile = path.resolve(osDir, 'kernel.bin');
  const kernelUnitTestBinFile = path.resolve(osDir, 'kernel_test.bin');

  const sectorMap = parsedArgs.sectorMap ? fsExtra.readJsonSync(parsedArgs.sectorMap) : defaultOsFloppySectorMap;

  return {
    destinationFloppyImage,
    assemblerBinFile,
    assemblerVersion,

    previousVersionBootloadBinFile,
    previousVersionKernelBinFile,

    bootloadSourceFile,
    kernelSourceFile,
    kernelUnitTestSourceFile,

    bootloadBinDestinationFile,
    kernelBinDestinationFile,
    kernelUnitTestBinFile,

    sectorMap,
  };
}
