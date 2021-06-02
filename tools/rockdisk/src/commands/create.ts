import * as colors from 'colors';
import * as path from 'path';
import * as yargs from 'yargs';
import { createBlankDisk, floppySize, toFriendlySize } from '../disk';
import { parseSize } from '../utility';

const epilog =
  "The size field can be suffixed with 'd' or 'h' to represent decimal or hex numbers. The default is " +
  'decimal if not specified.\n\n' +
  'For the type paramter you can also specify one of the following preset values. For example --type floppy\n\n' +
  '    floppy - 3.5 inch 1.44 MB';

export const command = 'create';
export const describe = 'Creates a blank disk for use in a virtual machine';
export const builder = (argv: yargs.Argv): yargs.Argv<RawArgs> => {
  return argv
    .usage('Usage: rockdisk create --out <destFile> [--size <bytes> | --type <diskType>]')
    .option('out', {
      alias: 'o',
      describe: 'Path to the destination file',
      type: 'string',
      demandOption: true,
      requiresArg: true,
      normalize: true,
    })
    .option('size', {
      alias: 's',
      describe: 'Size of the disk in bytes',
      type: 'string',
      requiresArg: true,
    })
    .option('type', {
      alias: 't',
      describe: 'Type of disk',
      type: 'string',
      choices: ['floppy'],
    })
    .conflicts('size', 'type')
    .strict()
    .epilog(epilog);
};

export const handler = (argv: yargs.Arguments<RawArgs>): void => {
  const resolvedOptions: CreateOptions = resolveOptions(argv);
  createBlankDisk(resolvedOptions.outPath, resolvedOptions.sizeInBytes);
  console.log(
    colors.green(
      `Created disk of size ${toFriendlySize(resolvedOptions.sizeInBytes)} to '${resolvedOptions.outPath}'.`,
    ),
  );
};

interface RawArgs {
  out: string;
  size?: string;
  type?: string;
}

export interface CreateOptions {
  outPath: string;
  sizeInBytes: number;
}

/**
 * Parses the arguments specific to the 'create' command. Exposed mainly for unit tests.
 */
export function parseArgs(args: string[]): CreateOptions {
  if (args.length === 0 || args[0] !== 'create') {
    args = ['create'].concat(args);
  }

  const parsedArgs = yargs(args)
    .command(command, describe, builder)
    .fail((msg: string) => {
      throw new Error(msg);
    })
    .parseSync();

  return resolveOptions(parsedArgs);
}

function resolveOptions(parsedArgs: yargs.Arguments<RawArgs>): CreateOptions {
  const outPath: string = path.resolve(parsedArgs.out);
  const sizeInBytes: number = parseSize(parsedArgs.size || floppySize);
  return {
    outPath,
    sizeInBytes,
  };
}
