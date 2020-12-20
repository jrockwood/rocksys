import mock = require('mock-fs');
import * as path from 'path';
import { parseArgs } from '../../src/commands/compile-os';
import { OsFloppySectorMap } from '../../src/os-disk';

describe('compile-os CLI command', () => {
  afterEach(() => {
    mock.restore();
  });

  describe('parseArgs()', () => {
    describe('required arguments', () => {
      it('should throw if missing the --srcDir argument', () => {
        const action = () => parseArgs(['--destVfd', 'floppy.vfd', '--asmVersion', 'v0.3', '--osVersion', 'v0.6']);
        expect(action).toThrowError('Missing required argument: srcDir');
      });

      it('should throw if missing the --destVfd argument', () => {
        const action = () => parseArgs(['--srcDir', 'src', '--asmVersion', 'v0.3', '--osVersion', 'v0.6']);
        expect(action).toThrowError('Missing required argument: destVfd');
      });

      it('should throw if missing the --asmVersion argument', () => {
        const action = () => parseArgs(['--destVfd', 'floppy.vfd', '--srcDir', 'src', '--osVersion', 'v0.6']);
        expect(action).toThrowError('Missing required argument: asmVersion');
      });

      it('should throw if missing the --osVersion argument', () => {
        const action = () => parseArgs(['--destVfd', 'floppy.vfd', '--srcDir', 'src', '--asmVersion', 'v0.3']);
        expect(action).toThrowError('Missing required argument: osVersion');
      });
    });

    it('should correctly resolve the paths', () => {
      const args = ['--destVfd', 'floppy.vfd', '--srcDir', 'src', '--asmVersion', 'v0.3', '--osVersion', 'v0.7'];
      const actual = parseArgs(args);

      const cwd = process.cwd();
      expect(actual.destinationFloppyImage).toBe(path.join(cwd, 'floppy.vfd'));
      expect(actual.assemblerBinFile).toBe(path.join(cwd, 'src', 'rockasm', 'v0.3', 'rockasm.bin'));

      expect(actual.previousVersionBootloadBinFile).toBe(path.join(cwd, 'src', 'rockos', 'v0.6', 'bootload.bin'));
      expect(actual.previousVersionKernelBinFile).toBe(path.join(cwd, 'src', 'rockos', 'v0.6', 'kernel.bin'));

      expect(actual.bootloadBinDestinationFile).toBe(path.join(cwd, 'src', 'rockos', 'v0.7', 'bootload.bin'));
      expect(actual.bootloadSourceFile).toBe(path.join(cwd, 'src', 'rockos', 'v0.7', 'bootload.rasm'));

      expect(actual.kernelBinDestinationFile).toBe(path.join(cwd, 'src', 'rockos', 'v0.7', 'kernel.bin'));
      expect(actual.kernelSourceFile).toBe(path.join(cwd, 'src', 'rockos', 'v0.7', 'kernel.rasm'));

      expect(actual.kernelUnitTestBinFile).toBe(path.join(cwd, 'src', 'rockos', 'v0.7', 'kernel_test.bin'));
      expect(actual.kernelUnitTestSourceFile).toBe(path.join(cwd, 'src', 'rockos', 'v0.7', 'kernel_test.rasm'));
    });

    it('should parse the sectorMap json file', () => {
      const sectorMap: OsFloppySectorMap = {
        bootSector: 0,
        kernelSector: 1,
        kernelSizeInSectors: 1,

        assemblerSector: 2,
        assembledFileSizeInSectors: 2,

        sourceFileSector: 3,
        sourceFileSizeInSectors: 3,

        assembledFileSector: 4,
        assemblerSizeInSectors: 4,
      };
      mock({
        'sectorMap.json': JSON.stringify(sectorMap, undefined, '  '),
      });

      const args = [
        '--destVfd',
        'floppy.vfd',
        '--srcDir',
        'src',
        '--asmVersion',
        'v0.3',
        '--osVersion',
        'v0.7',
        '--sectorMap',
        'sectorMap.json',
      ];
      const actual = parseArgs(args);

      expect(actual.sectorMap).toEqual(sectorMap);
    });
  });
});
