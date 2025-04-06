import { singleton, inject, delay } from 'tsyringe';
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
  private logLevel?: LogLevel;

  constructor(
    @inject(delay(() => ConfigService)) private readonly configServiceFactory: () => ConfigService<z.infer<typeof configSchema>>
  ) {}

  private ensureInitialized(): void {
    if (this.logLevel === undefined) {
      this.logLevel = this.getLogLevelFromEnvironment();
    }
  }

  private getLogLevelFromEnvironment(): LogLevel {
    try {
      const configService = this.configServiceFactory();
      const nodeEnv = configService.get('NODE_ENV');
      const logLevelString = configService.get('LOG_LEVEL');

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
    } catch (error) {
      console.warn('Error initializing logger, defaulting to INFO level:', error);
      return LogLevel.INFO; // Fallback if config service fails
    }
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
    this.ensureInitialized();
    return this.logLevel !== undefined && level >= this.logLevel;
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