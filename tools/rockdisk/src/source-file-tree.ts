import fsExtra = require('fs-extra');
import path = require('path');
import { VersionInfo } from './version-info';

export class SourceFileTree {
  public readonly rootDirectory: string;
  public readonly floppyVfdFile: string;

  private readonly _rockasmDir: string;
  private readonly _rockosDir: string;

  public constructor(rootDirectory: string) {
    this.rootDirectory = rootDirectory;
    this.floppyVfdFile = path.resolve(rootDirectory, 'disks', 'rockos.vfd');
    this._rockasmDir = path.resolve(rootDirectory, 'src', 'rockasm');
    this._rockosDir = path.resolve(rootDirectory, 'src', 'rockos');
  }

  public getAssemblerVersions(): string[] {
    const versionDirectories = getVersionedDirectories(this._rockasmDir);
    return versionDirectories;
  }

  public getOsVersions(): string[] {
    const versionDirectories = getVersionedDirectories(this._rockosDir);
    return versionDirectories;
  }

  public getAssemblerBin(version: string): string {
    return this.getAssemblerFile(version, 'rockasm.bin');
  }

  public getOsFile(version: string, fileName: string): string {
    const filePath = path.resolve(this._rockosDir, version, fileName);
    return filePath;
  }

  public getAssemblerFile(version: string, fileName: string): string {
    const filePath = path.resolve(this._rockasmDir, version, fileName);
    return filePath;
  }
}

function getVersionedDirectories(rootDirectory: string): string[] {
  const directories: fsExtra.Dirent[] = fsExtra.readdirSync(rootDirectory, { withFileTypes: true });
  const versionDirectories = directories
    .filter((x) => VersionInfo.tryParse(x.name) !== undefined)
    .map((x) => x.name)
    .sort();

  return versionDirectories;
}
