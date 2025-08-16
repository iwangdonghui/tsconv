/**
 * Simple Logger Utility
 *
 * Provides structured logging for API handlers with different log levels
 * and optional context information.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogContext {
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatLogEntry(entry: LogEntry): string {
    const levelName = LogLevel[entry.level];
    let formatted = `[${entry.timestamp}] ${levelName}: ${entry.message}`;

    if (entry.context && Object.keys(entry.context).length > 0) {
      formatted += ` | Context: ${JSON.stringify(entry.context)}`;
    }

    if (entry.error) {
      formatted += ` | Error: ${entry.error.message}`;
      if (entry.error.stack) {
        formatted += `\nStack: ${entry.error.stack}`;
      }
    }

    return formatted;
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
    };

    const formatted = this.formatLogEntry(entry);

    // In production, you might want to send logs to a service
    // For now, we'll use console but in a controlled way
    switch (level) {
      case LogLevel.DEBUG:
        // eslint-disable-next-line no-console
        console.debug(formatted);
        break;
      case LogLevel.INFO:
        // eslint-disable-next-line no-console
        console.info(formatted);
        break;
      case LogLevel.WARN:
        // eslint-disable-next-line no-console
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
        // eslint-disable-next-line no-console
        console.error(formatted);
        break;
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext, error?: Error): void {
    this.log(LogLevel.WARN, message, context, error);
  }

  error(message: string, context?: LogContext, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, error);
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Convenience functions for common use cases
export const logError = (message: string, error?: Error, context?: LogContext): void => {
  logger.error(message, context, error);
};

export const logWarn = (message: string, context?: LogContext): void => {
  logger.warn(message, context);
};

export const logInfo = (message: string, context?: LogContext): void => {
  logger.info(message, context);
};

export const logDebug = (message: string, context?: LogContext): void => {
  logger.debug(message, context);
};
