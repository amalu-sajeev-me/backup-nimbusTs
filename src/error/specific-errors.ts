import { StatusCodes } from 'http-status-codes';
import { ApplicationError, ErrorDetails } from './application-error';

export class ConfigurationError extends ApplicationError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, StatusCodes.INTERNAL_SERVER_ERROR, 'CONFIGURATION_ERROR', details);
  }
}

export class BackupError extends ApplicationError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, StatusCodes.INTERNAL_SERVER_ERROR, 'BACKUP_ERROR', details);
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, StatusCodes.BAD_REQUEST, 'VALIDATION_ERROR', details);
  }
}

export class StorageError extends ApplicationError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, StatusCodes.INTERNAL_SERVER_ERROR, 'STORAGE_ERROR', details);
  }
}

export class CommandExecutionError extends ApplicationError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, StatusCodes.INTERNAL_SERVER_ERROR, 'COMMAND_EXECUTION_ERROR', details);
  }
}

export class NotFoundError extends ApplicationError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, StatusCodes.NOT_FOUND, 'NOT_FOUND', details);
  }
}

export class NotificationError extends ApplicationError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, StatusCodes.INTERNAL_SERVER_ERROR, 'NOTIFICATION_ERROR', details);
  }
}