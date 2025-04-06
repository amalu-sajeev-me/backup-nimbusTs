import { APIGatewayProxyEventV2, APIGatewayProxyResult, Context } from 'aws-lambda';
import { StatusCodes } from 'http-status-codes';
import { singleton, inject } from 'tsyringe';
import { MongoBackupProvider } from '../backup/providers/mongo.backup.provider';
import { BackupError, ErrorHandler } from '../error';
import { Logger } from '../utils/logger/logger';
import { NotificationService } from '../notification';
import { BackupResult } from '../backup/providers/backup.provider';

@singleton()
export class HandlerService {
  constructor(
    @inject(MongoBackupProvider) private readonly backupProvider: MongoBackupProvider,
    @inject(ErrorHandler) private readonly errorHandler: ErrorHandler,
    @inject(Logger) private readonly logger: Logger,
    @inject(NotificationService) private readonly notificationService: NotificationService
  ) {}

  async processEvent(
    event?: APIGatewayProxyEventV2,
    _context?: Context,
  ): Promise<APIGatewayProxyResult> {
    try {
      const backupResult = await this.performBackup();
      
      if (!backupResult.success) {
        return this.handleFailedBackup(backupResult);
      }
      
      await this.notifyBackupSuccess(backupResult);
      return this.createSuccessResponse(backupResult, event);
    } catch (error) {
      await this.notifyUnexpectedError(error);
      return this.errorHandler.handleError(error);
    }
  }

  private async performBackup(): Promise<BackupResult> {
    this.logger.info('Creating backup...', 'HandlerService');
    const backupResult = await this.backupProvider.createBackup();
    this.logger.info('Backup completed', 'HandlerService', { success: backupResult.success });
    return backupResult;
  }

  private async handleFailedBackup(backupResult: BackupResult): Promise<APIGatewayProxyResult> {
    await this.notifyBackupFailure(backupResult);
    
    return this.errorHandler.handleError(
      new BackupError(backupResult.error ?? 'Backup operation failed', {
        details: { backupResult }
      })
    );
  }

  private async notifyBackupSuccess(backupResult: BackupResult): Promise<void> {
    if (!this.notificationService.isEnabled()) return;
    
    await this.notificationService.sendBackupSuccessNotification({
      backupId: backupResult.backupId,
      timestamp: backupResult.timestamp,
      size: backupResult.size,
      location: backupResult.location
    });
  }

  private async notifyBackupFailure(backupResult: BackupResult): Promise<void> {
    if (!this.notificationService.isEnabled()) return;
    
    await this.notificationService.sendBackupFailureNotification(
      backupResult.error ?? 'Unknown error',
      { backupResult }
    );
  }

  private async notifyUnexpectedError(error: unknown): Promise<void> {
    if (!this.notificationService.isEnabled()) return;
    
    try {
      await this.notificationService.sendBackupFailureNotification(
        error instanceof Error ? error.message : 'Unknown error',
        { stack: error instanceof Error ? error.stack : undefined }
      );
    } catch (notificationError) {
      this.logger.error('Failed to send error notification', 'HandlerService', notificationError);
    }
  }

  private createSuccessResponse(backupResult: BackupResult, event?: APIGatewayProxyEventV2): APIGatewayProxyResult {
    return {
      statusCode: StatusCodes.OK,
      body: JSON.stringify({
        message: 'Backup created successfully',
        backupResult,
        input: event,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }
}