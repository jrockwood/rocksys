import * as fsExtra from 'fs-extra';
import { copyBlock, createBlankDisk, floppySize, toFriendlySize } from '../src/disk';
import { safeDeleteFiles } from './test-utils';

describe('Disk', () => {
  describe('toFriendlySize()', () => {
    it('should return the correct size for a floppy disk', () => {
      expect(toFriendlySize(floppySize)).toBe('1.44 MB');
    });

    it('should throw on any size other than a floppy size', () => {
      const action = () => toFriendlySize(10);
      expect(action).toThrowError();
    });
  });

  describe('createBlankDisk()', () => {
    it('should create a blank file zeroed out', () => {
      createBlankDisk('temp', 10);

      const buffer: Buffer = fsExtra.readFileSync('temp');
      const contents: Uint8Array = Uint8Array.from(buffer);
      expect(contents).toEqual(new Uint8Array(10));

      fsExtra.unlinkSync('temp');
    });
  });

  describe('copyBlock()', () => {
    const sourceContents: Uint8Array = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const destContents: Uint8Array = new Uint8Array([0xa, 0xb, 0xc, 0xd, 0xe, 0xf]);

    beforeEach(() => {
      fsExtra.writeFileSync('in.bin', sourceContents);
      fsExtra.writeFileSync('out.bin', destContents);
    });

    afterEach(() => {
      safeDeleteFiles('in.bin', 'out.bin');
    });

    it('should copy the source file into the destination at a specified destination offset', () => {
      copyBlock('in.bin', 'out.bin', 4, 3, 1);
      const newContents: Uint8Array = new Uint8Array(fsExtra.readFileSync('out.bin'));
      expect(newContents).toEqual(new Uint8Array([0xa, 4, 5, 6, 0xe, 0xf]));
    });

    it('should copy the entire source file into the destination if no length is specified', () => {
      copyBlock('in.bin', 'out.bin');
      const newContents: Uint8Array = new Uint8Array(fsExtra.readFileSync('out.bin'));
      expect(newContents).toEqual(sourceContents);
    });

    it('should return the total bytes read', () => {
      expect(copyBlock('in.bin', 'out.bin')).toBe(sourceContents.length);
    });
  });
});
