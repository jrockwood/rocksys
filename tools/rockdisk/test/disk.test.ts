import * as fsExtra from 'fs-extra';
import mock = require('mock-fs');
import {
  copyBlock,
  createBlankDisk,
  DiskSectorRange,
  floppySize,
  toFriendlySize,
  trimTrailingZerosAndAlignTo16ByteBoundary,
} from '../src/disk';

describe('Disk', () => {
  describe('DiskSectorRange', () => {
    it('should store the ctor arguments', () => {
      const sectorRange = new DiskSectorRange(1, 2, 3);
      expect(sectorRange.startSector).toBe(1);
      expect(sectorRange.sectorCount).toBe(2);
      expect(sectorRange.bytesPerSector).toBe(3);
    });

    it('should calculate the startAddress', () => {
      const sectorRange = new DiskSectorRange(4, 4, 10);
      expect(sectorRange.startAddress).toBe(40);
    });

    it('should calculate the endSector', () => {
      const sectorRange = new DiskSectorRange(0, 4, 10);
      expect(sectorRange.endSector).toBe(3);
    });

    it('should calculate the totalBytes', () => {
      const sectorRange = new DiskSectorRange(0, 4, 10);
      expect(sectorRange.totalBytes).toBe(40);
    });
  });

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
    beforeEach(() => {
      mock();
    });

    afterEach(() => {
      mock.restore();
    });

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
      mock({
        'in.bin': Buffer.from(sourceContents),
        'out.bin': Buffer.from(destContents),
      });
    });

    afterEach(() => {
      mock.restore();
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

  describe('trimTrailingZerosAndAlignTo16ByteBoundary()', () => {
    afterEach(() => {
      mock.restore();
    });

    it('should not trim anything if there are no trailing zeros', () => {
      mock({ 'in.bin': Buffer.from(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 6, 7, 8])) });
      const bytesTrimmed = trimTrailingZerosAndAlignTo16ByteBoundary('in.bin');
      expect(bytesTrimmed).toBe(0);
      expect(fsExtra.readFileSync('in.bin')).toEqual(
        Buffer.from(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 6, 7, 8])),
      );
    });

    it('should not trim any zeros if they fill out the 16 byte boundary', () => {
      mock({ 'in.bin': Buffer.from(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 0, 0, 0, 0, 0])) });
      const bytesTrimmed = trimTrailingZerosAndAlignTo16ByteBoundary('in.bin');
      expect(bytesTrimmed).toBe(0);
      expect(fsExtra.readFileSync('in.bin')).toEqual(
        Buffer.from(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 0, 0, 0, 0, 0])),
      );
    });

    it('should pad extra zeros to fill up to a 16 byte boundary', () => {
      mock({ 'in.bin': Buffer.from(new Uint8Array([1, 2, 3, 4])) });
      const bytesTrimmed = trimTrailingZerosAndAlignTo16ByteBoundary('in.bin');
      expect(bytesTrimmed).toBe(-12);
      expect(fsExtra.readFileSync('in.bin')).toEqual(
        Buffer.from(new Uint8Array([1, 2, 3, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])),
      );
    });

    it('should trim trailing zeros until a 16 byte boundary', () => {
      // prettier-ignore
      mock({ 'in.bin': Buffer.from(new Uint8Array([
        1, 2, 3, 4, 5, 6, 7, 8,  1, 2, 3, 4, 5, 6, 7, 8,
        1, 2, 3, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0, 0,
      ])) });
      const bytesTrimmed = trimTrailingZerosAndAlignTo16ByteBoundary('in.bin');
      expect(bytesTrimmed).toBe(32);
      expect(fsExtra.readFileSync('in.bin')).toEqual(
        Buffer.from(
          // prettier-ignore
          new Uint8Array([
            1, 2, 3, 4, 5, 6, 7, 8,  1, 2, 3, 4, 5, 6, 7, 8,
            1, 2, 3, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0, 0,
          ]),
        ),
      );
    });
  });
});
