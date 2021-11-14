export enum LogLevel {
  Error = 'ERROR',
  Info = 'INFO',
}

export class Logger {
  static error(str: string): void {
    this.internalLog(LogLevel.Error, str);
  }

  static info(str: string): void {
    this.internalLog(LogLevel.Info, str);
  }

  static internalLog(level: LogLevel, str: string): void {
    let prefix = `\x1b[0m[${new Date().toDateString()} ${new Date().toLocaleTimeString()}] `;

    switch (level) {
      case LogLevel.Error:
        prefix = `${prefix}\x1b[91m[${level}]`;
        break;
      case LogLevel.Info:
        prefix = `${prefix}\x1b[32m[${level}]\x1b[0m`;
        break;
      default:
        throw new Error('Unknown level');
    }

    console.log(`${prefix} ${str}\x1b[0m`);
  }
}
