import { singleton, inject } from 'tsyringe';
import { ConfigService } from '../../config/config.service';
import { configSchema } from '../../config/config.schema';
import { z } from 'zod';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: string;
  data?: Record<string, unknown>;
}

@singleton()
export class Logger {
  private readonly logLevel: LogLevel;

  constructor(
    @inject(ConfigService) private readonly configService: ConfigService<z.infer<typeof configSchema>>
  ) {
    this.logLevel = this.getLogLevelFromEnvironment();
  }

  private getLogLevelFromEnvironment(): LogLevel {
    const nodeEnv = this.configService.get('NODE_ENV');
    const logLevelString = this.configService.get('LOG_LEVEL');

    if (logLevelString) {
      const level = logLevelString.toUpperCase();
      if (level in LogLevel) {
        return LogLevel[level as keyof typeof LogLevel];
      }
    }

    // Default log levels based on environment
    if (nodeEnv === 'production') {
      return LogLevel.INFO;
    } else if (nodeEnv === 'test') {
      return LogLevel.ERROR;
    }
    
    return LogLevel.DEBUG; // Development default
  }

  private formatLog(level: string, message: string, context?: string, data?: Record<string, unknown>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      data,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private logToConsole(entry: LogEntry): void {
    const prefix = `[${entry.timestamp}] [${entry.level}]${entry.context ? ` [${entry.context}]` : ''}`;
    
    switch(entry.level) {
      case 'ERROR':
        console.error(prefix, entry.message, entry.data ? entry.data : '');
        break;
      case 'WARN':
        console.warn(prefix, entry.message, entry.data ? entry.data : '');
        break;
      case 'DEBUG':
        console.debug(prefix, entry.message, entry.data ? entry.data : '');
        break;
      default:
        console.log(prefix, entry.message, entry.data ? entry.data : '');
    }
  }

  debug(message: string, context?: string, data?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const entry = this.formatLog('DEBUG', message, context, data);
      this.logToConsole(entry);
    }
  }

  info(message: string, context?: string, data?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const entry = this.formatLog('INFO', message, context, data);
      this.logToConsole(entry);
    }
  }

  warn(message: string, context?: string, data?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const entry = this.formatLog('WARN', message, context, data);
      this.logToConsole(entry);
    }
  }

  error(message: string, context?: string, error?: unknown, data?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorData = error instanceof Error 
        ? { ...data, errorMessage: error.message, stack: error.stack }
        : data;
      
      const entry = this.formatLog('ERROR', message, context, errorData);
      this.logToConsole(entry);
    }
  }
}