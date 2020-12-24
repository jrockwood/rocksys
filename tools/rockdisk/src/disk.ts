import * as fsExtra from 'fs-extra';
import * as path from 'path';

// For a standard IBM formatted double-sided, high-density 3.5" floppy diskette, the following properties apply:
// - Data is recorded on two sides of the disk
// - Each side has 80 tracks
// - Each track has 18 sectors
// - Each sector holds 512 bytes (0.5 KB)
const floppySideCount = 2;
const floppyTracksPerSide = 80;
const floppySectorsPerTrack = 18;
export const floppyBytesPerSector = 512;
export const floppySize = floppySideCount * floppyTracksPerSide * floppySectorsPerTrack * floppyBytesPerSector;

export class DiskSectorRange {
  public readonly startSector: number;
  public readonly sectorCount: number;
  public readonly bytesPerSector: number;

  public get endSector(): number {
    return this.startSector + this.sectorCount - 1;
  }

  public get startAddress(): number {
    return this.startSector * this.bytesPerSector;
  }

  public get totalBytes(): number {
    return this.sectorCount * this.bytesPerSector;
  }

  public constructor(startSector: number, sectorCount: number, bytesPerSector: number) {
    this.startSector = startSector;
    this.sectorCount = sectorCount;
    this.bytesPerSector = bytesPerSector;
  }
}

export class FloppyDiskSectorRange extends DiskSectorRange {
  public constructor(startSector: number, sectorCount: number) {
    super(startSector, sectorCount, floppyBytesPerSector);
  }
}

export function toFriendlySize(sizeInBytes: number): string {
  if (sizeInBytes === floppySize) {
    return '1.44 MB';
  }

  throw new Error('Not implemented yet');
}

const bufferSize = 4096;

/**
 * Zeroes out all of the bytes on the disk.
 */
export function createBlankDisk(outPath: string, sizeInBytes: number): void {
  // open the destination file
  fsExtra.ensureDirSync(path.dirname(outPath));
  const writeFd = fsExtra.openSync(outPath, 'w');

  // copy blocks of 4K until we're done
  const buffer = new Uint8Array(bufferSize);
  for (let i = 0; i < sizeInBytes; i += buffer.byteLength) {
    const count = Math.floor(Math.min(sizeInBytes - i, buffer.byteLength));
    fsExtra.writeSync(writeFd, buffer, 0, count);
  }

  fsExtra.closeSync(writeFd);
}

/**
 * Copies a block of data from the source file to a location within the destination file.
 * @param sourceFilePath Path to the source file.
 * @param destinationDiskPath Path to the destination file.
 * @param sourceOffset Offset from the start of {@link sourceFilePath} from which to copy data.
 * @param maxSourceLength The maximum number of bytes to copy.
 * @param destinationOffset Offset from the start of {@link destinationDiskPath} to write the copied data.
 */
export function copyBlock(
  sourceFilePath: string,
  destinationDiskPath: string,
  sourceOffset?: number,
  maxSourceLength?: number,
  destinationOffset?: number,
): number {
  // open the source and destination files
  const sourceFile: number = openForRead(sourceFilePath);
  const destFile: number = openForWrite(destinationDiskPath);

  try {
    // copy blocks of 4K until we're done
    const sourceBuffer = new Uint8Array(bufferSize);
    let sourcePos = sourceOffset || 0;
    let destPos = destinationOffset || 0;
    let totalBytesRead = 0;
    const totalBytesToRead = maxSourceLength || Number.MAX_SAFE_INTEGER;
    let bytesToRead = Math.min(totalBytesToRead, bufferSize);

    while (bytesToRead > 0) {
      // read from the source into the buffer
      const bytesRead = fsExtra.readSync(sourceFile, sourceBuffer, 0, bytesToRead, sourcePos);
      if (bytesRead === 0) {
        break;
      }

      // write the buffer to the destination
      const bytesWritten = fsExtra.writeSync(destFile, sourceBuffer, 0, bytesRead, destPos);
      if (bytesRead !== bytesWritten) {
        throw new Error(`Copy error: read ${bytesRead} bytes but only wrote out ${bytesWritten}.`);
      }

      totalBytesRead += bytesRead;
      sourcePos += bytesRead;
      destPos += bytesWritten;

      bytesToRead = Math.min(totalBytesToRead - totalBytesRead, bufferSize);
    }

    return totalBytesRead;
  } finally {
    fsExtra.closeSync(sourceFile);
    fsExtra.closeSync(destFile);
  }
}

function openForRead(file: string): number {
  try {
    const fileDescriptor: number = fsExtra.openSync(file, 'r');
    return fileDescriptor;
  } catch (e) {
    const error: NodeJS.ErrnoException = e;
    if (error.code === 'ENOENT') {
      throw new Error(`Source file '${file}' not found.`);
    }

    throw e;
  }
}

function openForWrite(file: string): number {
  fsExtra.ensureFileSync(file);
  return fsExtra.openSync(file, 'r+');
}

/**
 * Truncates all of the trailing zeros from the file, ensuring that the file contains enough zeros to fill an entire
 * 16 byte "line".
 * @param filePath The file to truncate.
 * @returns The number of bytes that were trimmed.
 */
export function trimTrailingZerosAndAlignTo16ByteBoundary(filePath: string): number {
  // open the contents of the file into the buffer
  const buffer: Buffer = fsExtra.readFileSync(filePath);

  // find the last non-zero in the buffer, starting from the end and moving to the beginning
  let lastZeroIndex = buffer.length - 1;
  while (buffer[lastZeroIndex] === 0) {
    lastZeroIndex--;
  }

  // truncate the buffer if needed
  const truncatedBuffer = buffer.slice(0, lastZeroIndex + 1);

  // pad the last row to end at a 16 byte boundary
  const bytesInLastRow = truncatedBuffer.length % 16 === 0 ? 16 : truncatedBuffer.length % 16;
  const paddingLength = 16 - bytesInLastRow;
  const paddingBuffer = Buffer.alloc(paddingLength);
  const paddedBuffer = Buffer.concat([truncatedBuffer, paddingBuffer], truncatedBuffer.length + paddingLength);

  // write out the new buffer back to the file
  if (paddedBuffer.length !== buffer.length) {
    fsExtra.writeFileSync(filePath, paddedBuffer);
  }

  return buffer.length - paddedBuffer.length;
}
