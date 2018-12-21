import * as colors from 'colors';
import * as path from 'path';
import * as yargs from 'yargs';
import { copyBlock } from '../disk';
import { parseSize } from '../utility';

const epilog =
  "The offset and length fields can be suffixed with 'd' or 'h' to represent " +
  'decimal or hex numbers. The default is decimal if not specified.\n\n' +
  'The default value for the offset fields is 0.\n' +
  'The default value for the length fields is -1, indicating to use the size of the file.';

export const command = 'copy';
export const describe = 'Copies a file into a disk image at a particular offset';
export const builder = (argv: yargs.Argv) => {
  return argv
    .usage('Usage: rockdisk copy --src <sourceFile> --dest <destFile> [options]')
    .option('src', {
      alias: 's',
      describe: 'Source file to copy',
      requiresArg: true,
      type: 'string',
      demandOption: true,
      normalize: true,
    })
    .option('dest', {
      alias: 'd',
      describe: 'Destination file',
      requiresArg: true,
      type: 'string',
      demandOption: true,
      normalize: true,
    })
    .option('soff', {
      describe: 'Source offset from which to start copying',
      requiresArg: true,
      default: 0,
    })
    .option('slen', {
      describe: 'Amount of data to copy in bytes',
      requiresArg: true,
    })
    .option('doff', {
      describe: 'Destination offset to start writing',
      requiresArg: true,
      default: 0,
    })
    .strict()
    .epilog(epilog);
};

export const handler = (argv: yargs.Arguments<IRawArgs>) => {
  const options: ICopyOptions = resolveOptions(argv);
  const bytesWritten = copyBlock(
    options.sourceFile,
    options.destinationFile,
    options.sourceOffset,
    options.sourceLength,
    options.destinationOffset
  );
  console.log(colors.green(`Wrote ${bytesWritten} bytes to ${options.destinationFile}`));
};

interface IRawArgs {
  src: string;
  s: string;
  dest: string;
  d: string;
  soff: string;
  slen: string;
  doff: string;
}

export interface ICopyOptions {
  sourceFile: string;
  destinationFile: string;
  sourceOffset: number;
  sourceLength?: number;
  destinationOffset: number;
}

/**
 * Parses the arguments specific to the 'copy' command. Exposed mainly for unit tests.
 */
export function parseArgs(args: string[]): ICopyOptions {
  if (args.length === 0 || args[0] !== 'copy') {
    args = ['copy'].concat(args);
  }

  const parsedArgs = yargs(args)
    .command(command, describe, builder)
    .fail((msg: string) => {
      throw new Error(msg);
    }).argv;

  return resolveOptions(parsedArgs);
}

function resolveOptions(parsedArgs: yargs.Arguments<IRawArgs>): ICopyOptions {
  const sourceFile: string = path.resolve(parsedArgs.src);
  const destinationFile: string = path.resolve(parsedArgs.dest);
  const sourceOffset: number = parseSize(parsedArgs.soff || 0);
  const sourceLength: number | undefined = parsedArgs.slen ? parseSize(parsedArgs.slen) : undefined;
  const destinationOffset: number = parseSize(parsedArgs.doff || 0);
  return {
    sourceFile,
    destinationFile,
    sourceOffset,
    sourceLength,
    destinationOffset,
  };
}
