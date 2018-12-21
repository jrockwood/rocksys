import * as path from 'path';
import { parseArgs } from '../../src/commands/copy';

describe('Copy CLI command', () => {
  describe('parseArgs()', () => {
    describe('--src and --dest', () => {
      it('should throw if missing the --src argument', () => {
        const action = () => parseArgs(['--dest', 'out.bin']);
        expect(action).toThrowError('Missing required argument: src');
      });

      it('should throw if missing the --dest argument', () => {
        const action = () => parseArgs(['--src', 'in.bin']);
        expect(action).toThrowError('Missing required argument: dest');
      });

      it('should correctly resolve the src and dest paths', () => {
        const expectedInPath = path.join(process.cwd(), 'in.bin');
        const expectedOutPath = path.join(process.cwd(), 'out.bin');
        const actual = parseArgs(['--dest', 'out.bin', '--src', 'in.bin']);
        expect(actual.sourceFile).toBe(expectedInPath);
        expect(actual.destinationFile).toBe(expectedOutPath);
      });
    });

    it("should use default values when optional arguments aren't specified", () => {
      const actual = parseArgs(['--src', 'in.bin', '--dest', 'out.bin']);
      expect(actual.sourceOffset).toBe(0);
      expect(actual.sourceLength).toBeUndefined();
      expect(actual.destinationOffset).toBe(0);
    });

    describe('--soff', () => {
      it('should parse --soff as a decimal number with no suffix', () => {
        const actual = parseArgs(['--src', 'in.bin', '--dest', 'out.bin', '--soff', '10']);
        expect(actual.sourceOffset).toBe(10);
      });

      it("should parse --soff as a decimal number with the 'd' suffix", () => {
        const actual = parseArgs(['--src', 'in.bin', '--dest', 'out.bin', '--soff', '10d']);
        expect(actual.sourceOffset).toBe(10);
      });

      it("should parse --soff as a hex number with the 'h' suffix", () => {
        const actual = parseArgs(['--src', 'in.bin', '--dest', 'out.bin', '--soff', '10h']);
        expect(actual.sourceOffset).toBe(0x10);
      });

      it('should throw if missing a value after --soff', () => {
        const action = () => parseArgs(['--src', 'in.bin', '--dest', 'out.bin', '--soff']);
        expect(action).toThrowError('Not enough arguments following: soff');
      });
    });

    describe('--slen', () => {
      it('should parse --slen as a decimal number with no suffix', () => {
        const actual = parseArgs(['--src', 'in.bin', '--dest', 'out.bin', '--slen', '10']);
        expect(actual.sourceLength).toBe(10);
      });

      it("should parse --slen as a decimal number with the 'd' suffix", () => {
        const actual = parseArgs(['--src', 'in.bin', '--dest', 'out.bin', '--slen', '10d']);
        expect(actual.sourceLength).toBe(10);
      });

      it("should parse --slen as a hex number with the 'h' suffix", () => {
        const actual = parseArgs(['--src', 'in.bin', '--dest', 'out.bin', '--slen', '10h']);
        expect(actual.sourceLength).toBe(0x10);
      });

      it('should throw if missing a value after --slen', () => {
        const action = () => parseArgs(['--src', 'in.bin', '--dest', 'out.bin', '--slen']);
        expect(action).toThrowError('Not enough arguments following: slen');
      });
    });

    describe('--doff', () => {
      it('should parse --doff as a decimal number with no suffix', () => {
        const actual = parseArgs(['--src', 'in.bin', '--dest', 'out.bin', '--doff', '10']);
        expect(actual.destinationOffset).toBe(10);
      });

      it("should parse --doff as a decimal number with the 'd' suffix", () => {
        const actual = parseArgs(['--src', 'in.bin', '--dest', 'out.bin', '--doff', '10d']);
        expect(actual.destinationOffset).toBe(10);
      });

      it("should parse --doff as a hex number with the 'h' suffix", () => {
        const actual = parseArgs(['--src', 'in.bin', '--dest', 'out.bin', '--doff', '10h']);
        expect(actual.destinationOffset).toBe(0x10);
      });

      it('should throw if missing a value after --doff', () => {
        const action = () => parseArgs(['--src', 'in.bin', '--dest', 'out.bin', '--doff']);
        expect(action).toThrowError('Not enough arguments following: doff');
      });
    });
  });
});
