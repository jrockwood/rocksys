/**
 * Represents a major.minor version.
 */
export class VersionInfo {
  public readonly major: number;
  public readonly minor: number;

  public constructor(major: number, minor: number) {
    this.major = major;
    this.minor = minor;
  }

  /**
   * Tries to parse the version string into a major/minor pair.
   * @param versionString A version string in the form 'vX.Y'
   */
  public static tryParse(versionString: string): VersionInfo | undefined {
    const versionRegEx = /v(?<major>\d+)\.(?<minor>\d+)/;
    const groups = versionString.match(versionRegEx)?.groups;
    if (!groups) {
      return undefined;
    }

    const major = parseInt(groups.major, 10);
    const minor = parseInt(groups.minor, 10);

    return new VersionInfo(major, minor);
  }

  /**
   * Parses the version string into a major/minor pair.
   * @param versionString A version string in the form 'vX.Y'
   */
  public static parse(versionString: string): VersionInfo {
    const parsed = this.tryParse(versionString);
    if (!parsed) {
      throw new Error(`Version is not in a correct format: '${versionString}'`);
    }

    return parsed;
  }

  /**
   * Returns a copy of this instance with the minor version decremented. Throws an error if the minor version is already zero.
   */
  public decrementMinor(): VersionInfo {
    if (this.minor === 0) {
      throw new Error('Cannot decrement the minor version below zero');
    }

    return new VersionInfo(this.major, this.minor - 1);
  }

  public toString(): string {
    return `v${this.major}.${this.minor}`;
  }
}
