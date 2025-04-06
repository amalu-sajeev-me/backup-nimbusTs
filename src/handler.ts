import { APIGatewayProxyEventV2, APIGatewayProxyResult, Context } from 'aws-lambda';
import { StatusCodes } from 'http-status-codes';
import { container } from 'tsyringe';
import { MongoBackupProvider } from './backup/providers/mongo.backup.provider';
import { BackupError, ErrorHandler } from './error';
import { Logger } from './utils/logger/logger';

const handler = async (
  event?: APIGatewayProxyEventV2,
  _context?: Context,
  _callback?: CallableFunction,
): Promise<APIGatewayProxyResult> => {
  const errorHandler = container.resolve(ErrorHandler);
  const logger = container.resolve<Logger>(Logger);

  try {
    const backupProvider = container.resolve(MongoBackupProvider);
    logger.info('Creating backup...', 'handler');
    const backupResult = await backupProvider.createBackup();
    logger.info('Backup completed', 'handler', { success: backupResult.success });
    
    if (!backupResult.success) {
      // Handle unsuccessful backup as an application-level error
      return errorHandler.handleError(
        new BackupError(backupResult.error ?? 'Backup operation failed', {
          details: { backupResult }
        })
      );
    }
    
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
  } catch (error) {
    return errorHandler.handleError(error);
  }
};

export { handler };
