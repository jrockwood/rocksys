import colors = require('colors');
import inquirer = require('inquirer');
import path = require('path');
import yargs = require('yargs');
import { copyBlock, DiskSectorRange, FloppyDiskSectorRange, trimTrailingZerosAndAlignTo16ByteBoundary } from '../disk';
import {
  BootableOsFloppyOptions,
  createBootableOsFloppy,
  defaultOsFloppySectorMap,
  OsFloppySectorMap,
} from '../os-disk';
import { SourceFileTree } from '../source-file-tree';

export const command = 'interactive';
export const describe = 'Interactively compile and build a RockOS floppy disk';
export const builder = (argv: yargs.Argv): yargs.Argv<RawArgs> => {
  return argv.usage(`Usage: rockdisk ${command} [options]`).option('rootDir', {
    alias: 'r',
    describe: 'Root directory of the rocksys repository',
    requiresArg: true,
    type: 'string',
    demandOption: false,
    normalize: true,
  });
};

export const handler = async (argv: yargs.Arguments<RawArgs>): Promise<void> => {
  const options: InteractiveOptions = resolveOptions(argv);
  const result = await startInteractiveSession(options);
  process.exit(result);
};

interface RawArgs {
  rootDir?: string;
}

export interface InteractiveOptions {
  readonly sourceFileTree: SourceFileTree;
}

export function parseArgs(args: string[]): InteractiveOptions {
  if (args.length === 0 || args[0] !== command) {
    args = [command, ...args];
  }

  const parsedArgs = yargs(args)
    .command(command, describe, builder)
    .fail((msg: string) => {
      throw new Error(msg);
    })
    .parseSync();

  return resolveOptions(parsedArgs);
}

function resolveOptions(parsedArgs: yargs.Arguments<RawArgs>): InteractiveOptions {
  const rootDir = parsedArgs.rootDir || findRootDir();
  const options: InteractiveOptions = { sourceFileTree: new SourceFileTree(rootDir) };
  return options;
}

function findRootDir(): string {
  let currentDirectory = process.cwd();
  while (currentDirectory && path.basename(currentDirectory) !== 'rocksys') {
    currentDirectory = path.dirname(currentDirectory);
  }

  if (path.basename(currentDirectory) !== 'rocksys') {
    throw new Error("Could not find the root directory for 'rocksys'");
  }

  return currentDirectory;
}

async function startInteractiveSession(options: InteractiveOptions): Promise<number> {
  console.log("Let's build a version of RockOS!\n");

  const questions: inquirer.QuestionCollection = [
    {
      name: 'mainCommand',
      message: 'What do you want to do?',
      type: 'list',
      choices: [
        { key: 'b', name: 'Compile bootload.rasm', value: 'bootload' },
        { key: 'k', name: 'Compile kernel.rasm', value: 'kernel' },
        { key: 'u', name: 'Compile kernel_test.rasm', value: 'kernel_test' },
        { key: 'a', name: 'Compile rockasm.rasm', value: 'assembler' },
      ],
    },
  ];

  const answers = await inquirer.prompt(questions);
  switch (answers.mainCommand) {
    case 'bootload':
      if (!(await compileFile(options, 'bootload', true))) {
        return 1;
      }
      break;

    case 'kernel':
      if (!(await compileFile(options, 'kernel', true))) {
        return 2;
      }
      break;

    case 'kernel_test':
      if (!(await compileFile(options, 'kernel_test', true))) {
        return 3;
      }
      break;

    case 'assembler':
      if (!(await compileFile(options, 'rockasm', false))) {
        return 4;
      }
      break;
  }

  return 0;
}

async function compileFile(options: InteractiveOptions, baseFileName: string, isOsFile: boolean): Promise<boolean> {
  const sourceFileTree = options.sourceFileTree;
  const osVersions: string[] = sourceFileTree.getOsVersions().reverse();
  const assemblerVersions: string[] = sourceFileTree.getAssemblerVersions().reverse();

  const questions: inquirer.QuestionCollection = [
    {
      name: 'fileVersion',
      message: `Which verion of ${baseFileName}.rasm do you want to compile?`,
      type: 'list',
      choices: isOsFile ? osVersions : assemblerVersions,
    },
  ];

  const answers: inquirer.Answers = await inquirer.prompt(questions);

  const sourceFileToCompile = isOsFile
    ? sourceFileTree.getOsFile(answers.fileVersion, `${baseFileName}.rasm`)
    : sourceFileTree.getAssemblerFile(answers.fileVersion, `${baseFileName}.rasm`);
  const floppyOptions: BootableOsFloppyOptions = await promptForBinFiles(sourceFileTree, sourceFileToCompile);
  const destinationBinFile = path.resolve(
    path.dirname(sourceFileToCompile),
    path.basename(sourceFileToCompile, 'rasm') + 'bin',
  );

  try {
    // Do the following until the user indicates success or wants to quit:
    // 1. Create the floppy disk
    // 2. Prompt the user to run the disk in the virtual machine
    // 3. Ask the user if the compile succeeded
    // 4. If so, copy the compiled file from the floppy back to disk
    let successfullyCompiled = false;
    while (!successfullyCompiled) {
      createBootableOsFloppy(floppyOptions);

      console.log(
        `Now run the ${path.basename(
          floppyOptions.destinationFloppyImage,
        )} in a virtual machine to compile the ${path.basename(sourceFileToCompile)} file.`,
      );

      const successAnswer = await inquirer.prompt([
        { name: 'success', message: 'Did the compile succeed?', type: 'confirm' },
      ]);

      successfullyCompiled = successAnswer.success;
      if (successfullyCompiled) {
        const sectorToCopy = floppyOptions.sectorMap.assembledFileSector;
        copyBlock(
          floppyOptions.destinationFloppyImage,
          destinationBinFile,
          sectorToCopy.startAddress,
          sectorToCopy.totalBytes,
        );

        trimTrailingZerosAndAlignTo16ByteBoundary(destinationBinFile);
      }
    }
  } catch (e) {
    const err = e as Error;
    console.log(colors.red(err.message));
    return false;
  }

  return true;
}

async function promptForBinFiles(
  sourceFileTree: SourceFileTree,
  sourceFileToCompile: string,
): Promise<BootableOsFloppyOptions> {
  const osVersions: string[] = sourceFileTree.getOsVersions().reverse();
  const assemblerVersions: string[] = sourceFileTree.getAssemblerVersions().reverse();

  const questions: inquirer.QuestionCollection = [
    {
      name: 'bootloadBinVersion',
      message: 'Which version of the bootload.bin do you want to use?',
      type: 'list',
      choices: osVersions,
    },
    {
      name: 'kernelBinVersion',
      message: 'Which version of the kernel.bin do you want to use?',
      type: 'list',
      choices: osVersions,
    },
    {
      name: 'assemblerVersion',
      message: 'Which version of the assembler do you want to use?',
      type: 'list',
      choices: assemblerVersions,
    },
  ];

  const answers: inquirer.Answers = await inquirer.prompt(questions);
  const bootloadBinFile = sourceFileTree.getOsFile(answers.bootloadBinVersion, 'bootload.bin');
  const kernelBinFile = sourceFileTree.getOsFile(answers.kernelBinVersion, 'kernel.bin');
  const assemblerBinFile = sourceFileTree.getAssemblerBin(answers.assemblerVersion);
  const sectorMap = await promptForSectorMap();

  return {
    destinationFloppyImage: sourceFileTree.floppyVfdFile,
    bootloadBinFile,
    kernelBinFile,
    assemblerBinFile,
    sourceFileToCompile,
    sectorMap,
  };
}

async function promptForSectorMap(): Promise<OsFloppySectorMap> {
  const bootSector: FloppyDiskSectorRange = await promptForSector('bootloader', defaultOsFloppySectorMap.bootSector);

  const kernelSector: FloppyDiskSectorRange = await promptForSector(
    'kernel',
    new FloppyDiskSectorRange(bootSector.endSector + 1, defaultOsFloppySectorMap.kernelSector.sectorCount),
  );

  const assemblerSector: FloppyDiskSectorRange = await promptForSector(
    'assembler',
    new FloppyDiskSectorRange(kernelSector.endSector + 1, defaultOsFloppySectorMap.assemblerSector.sectorCount),
  );

  const sourceFileSector: FloppyDiskSectorRange = await promptForSector(
    'source file',
    new FloppyDiskSectorRange(assemblerSector.endSector + 1, defaultOsFloppySectorMap.sourceFileSector.sectorCount),
  );

  const assembledFileSector: FloppyDiskSectorRange = await promptForSector(
    'output assembled file',
    new FloppyDiskSectorRange(sourceFileSector.endSector + 1, defaultOsFloppySectorMap.assembledFileSector.sectorCount),
  );

  return {
    bootSector,
    kernelSector,
    assemblerSector,
    sourceFileSector,
    assembledFileSector,
  };
}

async function promptForSector(sectorName: string, defaultSector: DiskSectorRange): Promise<FloppyDiskSectorRange> {
  const questions: inquirer.QuestionCollection = [
    {
      name: 'sectorNumber',
      message: `In which floppy sector is the ${sectorName}?`,
      type: 'number',
      default: defaultSector.startSector,
    },
    {
      name: 'sectorCount',
      message: `How many floppy sectors is the ${sectorName}?`,
      type: 'number',
      default: defaultSector.sectorCount,
    },
  ];

  const answers: inquirer.Answers = await inquirer.prompt(questions);
  return new FloppyDiskSectorRange(answers.sectorNumber, answers.sectorCount);
}
