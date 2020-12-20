import * as colors from 'colors';

export interface Prompter {
  report(message: string): void;
  reportError(message: string): void;
  reportSuccess(message: string): void;
  promptYesNo(message: string): Promise<boolean>;
  waitForAnyKey(message?: string): Promise<number>;
}

class OsPrompter implements Prompter {
  public report(message: string): void {
    console.log(message);
  }

  public reportError(message: string): void {
    console.log(colors.red(message));
  }

  public reportSuccess(message: string): void {
    console.log(colors.green(message));
  }

  public async promptYesNo(message: string): Promise<boolean> {
    while (true) {
      const char = await this.waitForAnyKey(message + ' [Y/N]');
      if (char === 'Y'.charCodeAt(0) || char === 'y'.charCodeAt(0)) {
        return true;
      } else if (char === 'N'.charCodeAt(0) || char === 'n'.charCodeAt(0)) {
        return false;
      }
    }
  }

  public waitForAnyKey(message?: string): Promise<number> {
    console.log(message || 'Press any key to continue...');
    process.stdin.setRawMode(true);
    return new Promise<number>((resolve) => {
      process.stdin.once('data', (data) => {
        const byteArray = [...data];
        if (byteArray.length > 0 && byteArray[0] === 3) {
          console.log('^C');
          process.exit(1);
        }

        process.stdin.setRawMode(false);
        resolve(byteArray[0]);
      });
    });
  }
}

export const DefaultPrompter = new OsPrompter();

export class VirtualPrompter implements Prompter {
  private readonly _messages: string[] = [];

  public yesNoResponses: boolean | ((prompt: string) => Promise<boolean>);

  public constructor(yesNoResponses: boolean | ((prompt: string) => Promise<boolean>)) {
    this.yesNoResponses = yesNoResponses;
  }

  public report(message: string): void {
    this._messages.push(message);
  }

  public reportError(message: string): void {
    this._messages.push(message);
  }

  public reportSuccess(message: string): void {
    this._messages.push(message);
  }

  public async promptYesNo(message: string): Promise<boolean> {
    this.report(message);
    if (typeof this.yesNoResponses == 'boolean') {
      return this.yesNoResponses;
    }

    const response = await this.yesNoResponses(message);
    return response;
  }

  public waitForAnyKey(message?: string): Promise<number> {
    this.report(message || 'Press any key to continue...');
    return Promise.resolve('\n'.charCodeAt(0));
  }
}
