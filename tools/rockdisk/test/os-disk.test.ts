import * as fsExtra from 'fs-extra';
import mock = require('mock-fs');
import { copyBlock, floppyBytesPerSector, FloppyDiskSectorRange, floppySize } from '../src/disk';
import { compileOs, createBootableOsFloppy, defaultOsFloppySectorMap, CompileOsOptions } from '../src/os-disk';
import { VirtualPrompter } from '../src/prompter';

describe('OsDisk', () => {
  describe('createBootableOsFloppy()', () => {
    const bootloadBinFile = 'bootload.bin';
    const kernelBinFile = 'kernel.bin';
    const assemblerBinFile = 'assember.bin';
    const sourceFileToCompile = 'source.rasm';
    const destinationFloppyImage = 'osdisk.vfd';

    const bootloadBinContents = new Uint8Array(['b', '0', '0', '7'].map((x) => x.charCodeAt(0)));
    const kernelBinContents = new Uint8Array([1, 2, 3, 4]);
    const assemblerBinContents = new Uint8Array([5, 6, 7, 8]);
    const sourceFileContents = 'source file';

    beforeEach(() => {
      mock({
        [bootloadBinFile]: Buffer.from(bootloadBinContents),
        [kernelBinFile]: Buffer.from(kernelBinContents),
        [assemblerBinFile]: Buffer.from(assemblerBinContents),
        [sourceFileToCompile]: sourceFileContents,
      });
    });

    afterEach(() => {
      mock.restore();
    });

    function createExpectedBuffer(): Buffer {
      const buffer = Buffer.alloc(floppySize, 0, 'binary');

      // bootloader
      buffer.write('b007', 'ascii');

      // kernel
      buffer.writeUInt8(1, 512);
      buffer.writeUInt8(2, 513);
      buffer.writeUInt8(3, 514);
      buffer.writeUInt8(4, 515);

      // assembler
      const assemblerOffset = defaultOsFloppySectorMap.assemblerSector.startAddress;
      buffer.writeUInt8(5, assemblerOffset);
      buffer.writeUInt8(6, assemblerOffset + 1);
      buffer.writeUInt8(7, assemblerOffset + 2);
      buffer.writeUInt8(8, assemblerOffset + 3);

      // source file
      buffer.write(sourceFileContents, defaultOsFloppySectorMap.sourceFileSector.startAddress, 'ascii');

      return buffer;
    }

    it('should create a floppy disk', () => {
      createBootableOsFloppy({
        destinationFloppyImage,
        bootloadBinFile,
        kernelBinFile,
        assemblerBinFile,
        sourceFileToCompile,
        sectorMap: defaultOsFloppySectorMap,
      });
      expect(fsExtra.existsSync(destinationFloppyImage)).toBe(true);

      const stats = fsExtra.statSync(destinationFloppyImage);
      expect(stats.size).toBe(floppySize);
    });

    it('should add the bootloader, kernel, assembler, and source file to the floppy disk image', () => {
      createBootableOsFloppy({
        destinationFloppyImage,
        bootloadBinFile,
        kernelBinFile,
        assemblerBinFile,
        sourceFileToCompile,
        sectorMap: defaultOsFloppySectorMap,
      });

      const expectedBuffer: Buffer = createExpectedBuffer();
      const buffer: Buffer = fsExtra.readFileSync(destinationFloppyImage);
      expect(buffer).toEqual(expectedBuffer);
    });

    it('should throw if the contents of the bootloader section are greater than the allocated space', () => {
      mock({
        [bootloadBinFile]: Buffer.from(new Array(floppyBytesPerSector * 2)),
        [kernelBinFile]: Buffer.from(kernelBinContents),
        [assemblerBinFile]: Buffer.from(assemblerBinContents),
        [sourceFileToCompile]: sourceFileContents,
      });

      const action = () =>
        createBootableOsFloppy({
          destinationFloppyImage,
          bootloadBinFile,
          kernelBinFile,
          assemblerBinFile,
          sourceFileToCompile,
          sectorMap: defaultOsFloppySectorMap,
        });

      expect(action).toThrowError(`The size of '${bootloadBinFile}' exceeds the maximum size of 512.`);
    });

    it('should throw if the contents of the kernel section are greater than the allocated space', () => {
      mock({
        [bootloadBinFile]: Buffer.from(bootloadBinContents),
        [kernelBinFile]: Buffer.from(new Array(defaultOsFloppySectorMap.kernelSector.totalBytes + 1)),
        [assemblerBinFile]: Buffer.from(assemblerBinContents),
        [sourceFileToCompile]: sourceFileContents,
      });

      const action = () =>
        createBootableOsFloppy({
          destinationFloppyImage,
          bootloadBinFile,
          kernelBinFile,
          assemblerBinFile,
          sourceFileToCompile,
          sectorMap: defaultOsFloppySectorMap,
        });

      expect(action).toThrowError(`The size of '${kernelBinFile}' exceeds the maximum size of 28672.`);
    });

    it('should throw if the contents of the assembler section are greater than the allocated space', () => {
      mock({
        [bootloadBinFile]: Buffer.from(bootloadBinContents),
        [kernelBinFile]: Buffer.from(kernelBinContents),
        [assemblerBinFile]: Buffer.from(new Array(defaultOsFloppySectorMap.assembledFileSector.totalBytes + 1)),
        [sourceFileToCompile]: sourceFileContents,
      });

      const action = () =>
        createBootableOsFloppy({
          destinationFloppyImage,
          bootloadBinFile,
          kernelBinFile,
          assemblerBinFile,
          sourceFileToCompile,
          sectorMap: defaultOsFloppySectorMap,
        });

      expect(action).toThrowError(`The size of '${assemblerBinFile}' exceeds the maximum size of 28672.`);
    });

    it('should throw if the contents of the source file section are greater than the allocated space', () => {
      mock({
        [bootloadBinFile]: Buffer.from(bootloadBinContents),
        [kernelBinFile]: Buffer.from(kernelBinContents),
        [assemblerBinFile]: Buffer.from(assemblerBinContents),
        [sourceFileToCompile]: Buffer.alloc(defaultOsFloppySectorMap.sourceFileSector.totalBytes + 1, 'a', 'ascii'),
      });

      const action = () =>
        createBootableOsFloppy({
          destinationFloppyImage,
          bootloadBinFile,
          kernelBinFile,
          assemblerBinFile,
          sourceFileToCompile,
          sectorMap: defaultOsFloppySectorMap,
        });

      expect(action).toThrowError(`The size of '${sourceFileToCompile}' exceeds the maximum size of 1024000.`);
    });
  });

  describe('buildRockOs()', () => {
    const floppyDiskPath = 'disks/rockos.vfd';
    let options: CompileOsOptions;

    beforeEach(() => {
      options = {
        destinationFloppyImage: floppyDiskPath,

        assemblerBinFile: 'assembler/v0.3/assembler.bin',
        assemblerVersion: 'v0.3',

        bootloadSourceFile: 'os/v0.6/bootload.rasm',
        kernelSourceFile: 'os/v0.6/kernel.rasm',
        kernelUnitTestSourceFile: 'os/v0.6/kernel_test.rasm',

        bootloadBinDestinationFile: 'os/v0.6/bootload.bin',
        kernelBinDestinationFile: 'os/v0.6/kernel.bin',
        kernelUnitTestBinFile: 'os/v0.6/kernel_test.bin',
      };

      mock({
        'compiled-bootload.bin': 'compiled-bootload.bin',
        'compiled-kernel.bin': 'compiled-kernel.bin',
        'compiled-kernel_test.bin': 'compiled-kernel_test.bin',
        assembler: {
          'v0.3': {
            'assembler.bin': 'assembler.bin',
          },
        },
        os: {
          'v0.6': {
            'bootload.bin': 'bootload.bin',
            'bootload.rasm': 'bootload.rasm',
            'kernel.bin': 'kernel.bin',
            'kernel.rasm': 'kernel.rasm',
            'kernel_test.bin': 'kernel_test.bin',
            'kernel_test.rasm': 'kernel_test.rasm',
          },
        },
      });
    });

    afterEach(() => {
      mock.restore();
    });

    it('should succeed and create a new virtual floppy disk file and the bootload.bin and kernel.bin', async () => {
      const succeeded = await compileOs(options, new VirtualPrompter(true));
      expect(succeeded).toBe(true);
      expect(fsExtra.existsSync(floppyDiskPath)).toBe(true);
      expect(fsExtra.existsSync(options.bootloadBinDestinationFile)).toBe(true);
      expect(fsExtra.existsSync(options.kernelBinDestinationFile)).toBe(true);
      expect(fsExtra.existsSync(options.kernelUnitTestBinFile)).toBe(true);
    });

    it('should have all of the proper segments on the floppy disk', async () => {
      options.sectorMap = {
        bootSector: new FloppyDiskSectorRange(0, 1),
        kernelSector: new FloppyDiskSectorRange(1, 1),
        assemblerSector: new FloppyDiskSectorRange(2, 1),
        sourceFileSector: new FloppyDiskSectorRange(3, 1),
        assembledFileSector: new FloppyDiskSectorRange(4, 1),
      };
      const sector1Offset = 1 * floppyBytesPerSector;
      const sector2Offset = 2 * floppyBytesPerSector;
      const sector3Offset = 3 * floppyBytesPerSector;
      const sector4Offset = 4 * floppyBytesPerSector;

      let promptCount = 0;
      const prompter = new VirtualPrompter(async () => {
        promptCount++;
        switch (promptCount) {
          case 1:
            copyBlock('compiled-bootload.bin', floppyDiskPath, 0, undefined, sector4Offset);
            break;

          case 2:
            copyBlock('compiled-kernel.bin', floppyDiskPath, 0, undefined, sector4Offset);
            break;

          case 3:
            copyBlock('compiled-kernel_test.bin', floppyDiskPath, 0, undefined, sector4Offset);
            break;
        }
        return true;
      });

      await compileOs(options, prompter);

      const fileBuffer: Buffer = fsExtra.readFileSync(floppyDiskPath);
      expect(fileBuffer.toString('ascii', 0, 'compiled-bootload.bin'.length)).toBe('compiled-bootload.bin');
      expect(fileBuffer.toString('ascii', sector1Offset, sector1Offset + 'compiled-kernel.bin'.length)).toBe(
        'compiled-kernel.bin',
      );
      expect(fileBuffer.toString('ascii', sector2Offset, sector2Offset + 'compiled-kernel_test.bin'.length)).toBe(
        'compiled-kernel_test.bin',
      );
      expect(fileBuffer.toString('ascii', sector3Offset, sector3Offset + 'kernel_test.rasm'.length)).toBe(
        'kernel_test.rasm',
      );
      expect(fileBuffer.readUInt8(sector4Offset)).toBe(0);
    });
  });
});
