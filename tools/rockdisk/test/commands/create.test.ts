import * as path from 'path';
import { parseArgs } from '../../src/commands/create';
import { floppySize } from '../../src/disk';

describe('Create CLI command', () => {
  describe('parseArgs()', () => {
    it('should throw if missing the --out argument', () => {
      const action = () => parseArgs([]);
      expect(action).toThrowError('Missing required argument: out');
    });

    it('should throw if there is an invalid --type argument', () => {
      const action = () => parseArgs(['--out', 'temp.bin', '--type', 'unknown']);
      expect(action).toThrowError(/Invalid values:\n  Argument: type, Given: "unknown", Choices: "floppy"/);
    });

    it('should throw if both --size and --type are specified', () => {
      const action = () => parseArgs(['--out', 'temp.bin', '--size', '123', '--type', 'floppy']);
      expect(action).toThrowError('Arguments size and type are mutually exclusive');
    });

    it('should correctly resolve the outPath', () => {
      const expectedPath = path.join(process.cwd(), 'temp.bin');
      const actual = parseArgs(['--out', 'temp.bin']);
      expect(actual.outPath).toBe(expectedPath);
    });

    it('should default to using the floppy size if no size or type is specified', () => {
      const actual = parseArgs(['--out', 'temp.bin']);
      expect(actual.sizeInBytes).toBe(floppySize);
    });

    it('should use the specified size', () => {
      const actual = parseArgs(['--out', 'temp.bin', '--size', '123']);
      expect(actual.sizeInBytes).toBe(123);
    });

    it('should use the specified type', () => {
      const actual = parseArgs(['--out', 'temp.bin', '--type', 'floppy']);
      expect(actual.sizeInBytes).toBe(floppySize);
    });
  });
});
