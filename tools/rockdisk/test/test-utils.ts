import * as fsExtra from 'fs-extra';

export function safeDeleteFiles(...filePaths: string[]): void {
  try {
    filePaths.forEach(fsExtra.unlinkSync);
  } catch {
    // do nothing
  }
}

export function deleteFilesOnExit(action: () => void, ...filePaths: string[]): void {
  try {
    action();
  } finally {
    safeDeleteFiles(...filePaths);
  }
}
