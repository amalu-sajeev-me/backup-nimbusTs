import { StatusCodes } from 'http-status-codes';

export interface ErrorDetails {
  path?: string;
  timestamp?: string;
  details?: Record<string, unknown>;
  cause?: Error | unknown;
}

export class ApplicationError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly path?: string;
  public readonly timestamp: string;
  public readonly details?: Record<string, unknown>;
  public readonly cause?: Error | unknown;

  constructor(
    message: string,
    statusCode = StatusCodes.INTERNAL_SERVER_ERROR,
    code = 'INTERNAL_SERVER_ERROR',
    details?: ErrorDetails,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.path = details?.path;
    this.timestamp = details?.timestamp || new Date().toISOString();
    this.details = details?.details;
    this.cause = details?.cause;

    // Maintains proper stack trace (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        timestamp: this.timestamp,
        path: this.path,
        details: this.details,
      },
    };
  }
}