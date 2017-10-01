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
        expect(actual).toEqual(
          jasmine.objectContaining({ sourceFile: expectedInPath, destinationFile: expectedOutPath })
        );
      });
    });

    it("should use default values when optional arguments aren't specified", () => {
      const actual = parseArgs(['--src', 'in.bin', '--dest', 'out.bin']);
      expect(actual).toEqual(
        jasmine.objectContaining({ sourceOffset: 0, sourceLength: undefined, destinationOffset: 0 })
      );
    });

    describe('--soff', () => {
      it('should parse --soff as a decimal number with no suffix', () => {
        const actual = parseArgs(['--src', 'in.bin', '--dest', 'out.bin', '--soff', '10']);
        expect(actual).toEqual(jasmine.objectContaining({ sourceOffset: 10 }));
      });

      it("should parse --soff as a decimal number with the 'd' suffix", () => {
        const actual = parseArgs(['--src', 'in.bin', '--dest', 'out.bin', '--soff', '10d']);
        expect(actual).toEqual(jasmine.objectContaining({ sourceOffset: 10 }));
      });

      it("should parse --soff as a hex number with the 'h' suffix", () => {
        const actual = parseArgs(['--src', 'in.bin', '--dest', 'out.bin', '--soff', '10h']);
        expect(actual).toEqual(jasmine.objectContaining({ sourceOffset: 0x10 }));
      });

      it('should throw if missing a value after --soff', () => {
        const action = () => parseArgs(['--src', 'in.bin', '--dest', 'out.bin', '--soff']);
        expect(action).toThrowError('Missing argument value: soff');
      });
    });

    describe('--slen', () => {
      it('should parse --slen as a decimal number with no suffix', () => {
        const actual = parseArgs(['--src', 'in.bin', '--dest', 'out.bin', '--slen', '10']);
        expect(actual).toEqual(jasmine.objectContaining({ sourceLength: 10 }));
      });

      it("should parse --slen as a decimal number with the 'd' suffix", () => {
        const actual = parseArgs(['--src', 'in.bin', '--dest', 'out.bin', '--slen', '10d']);
        expect(actual).toEqual(jasmine.objectContaining({ sourceLength: 10 }));
      });

      it("should parse --slen as a hex number with the 'h' suffix", () => {
        const actual = parseArgs(['--src', 'in.bin', '--dest', 'out.bin', '--slen', '10h']);
        expect(actual).toEqual(jasmine.objectContaining({ sourceLength: 0x10 }));
      });

      it('should throw if missing a value after --slen', () => {
        const action = () => parseArgs(['--src', 'in.bin', '--dest', 'out.bin', '--slen']);
        expect(action).toThrowError('Missing argument value: slen');
      });
    });

    describe('--doff', () => {
      it('should parse --doff as a decimal number with no suffix', () => {
        const actual = parseArgs(['--src', 'in.bin', '--dest', 'out.bin', '--doff', '10']);
        expect(actual).toEqual(jasmine.objectContaining({ destinationOffset: 10 }));
      });

      it("should parse --doff as a decimal number with the 'd' suffix", () => {
        const actual = parseArgs(['--src', 'in.bin', '--dest', 'out.bin', '--doff', '10d']);
        expect(actual).toEqual(jasmine.objectContaining({ destinationOffset: 10 }));
      });

      it("should parse --doff as a hex number with the 'h' suffix", () => {
        const actual = parseArgs(['--src', 'in.bin', '--dest', 'out.bin', '--doff', '10h']);
        expect(actual).toEqual(jasmine.objectContaining({ destinationOffset: 0x10 }));
      });

      it('should throw if missing a value after --doff', () => {
        const action = () => parseArgs(['--src', 'in.bin', '--dest', 'out.bin', '--doff']);
        expect(action).toThrowError('Missing argument value: doff');
      });
    });
  });
});
