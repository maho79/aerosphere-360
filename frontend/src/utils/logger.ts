export type LogLevel = 'INFO' | 'WARN' | 'ERROR';
export const LogLevel = {
  INFO: 'INFO' as const,
  WARN: 'WARN' as const,
  ERROR: 'ERROR' as const,
};

class Logger {
  private log(level: LogLevel, message: string, ...optionalParams: any[]) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level}] ${message}`;
    
    switch (level) {
      case LogLevel.INFO:
        console.log(formattedMessage, ...optionalParams);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, ...optionalParams);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage, ...optionalParams);
        break;
    }
  }

  info(message: string, ...optionalParams: any[]) {
    this.log(LogLevel.INFO, message, ...optionalParams);
  }

  warn(message: string, ...optionalParams: any[]) {
    this.log(LogLevel.WARN, message, ...optionalParams);
  }

  error(message: string, ...optionalParams: any[]) {
    this.log(LogLevel.ERROR, message, ...optionalParams);
  }
}

export const logger = new Logger();
