import * as fsExtra from 'fs-extra';
import * as path from 'path';

export const floppySize = 0x168000;
const bufferSize = 4096;

export function toFriendlySize(sizeInBytes: number): string {
  if (sizeInBytes === floppySize) {
    return '1.44 MB';
  }

  throw new Error('Not implemented yet');
}

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

export function copyBlock(
  sourceFilePath: string,
  destinationDiskPath: string,
  sourceOffset?: number,
  sourceLength?: number,
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
    const totalBytesToRead = sourceLength || Number.MAX_SAFE_INTEGER;
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
