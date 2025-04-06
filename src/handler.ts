import { APIGatewayProxyEventV2, APIGatewayProxyResult, Context } from 'aws-lambda';
import { StatusCodes } from 'http-status-codes';
import { container } from 'tsyringe';
import { MongoBackupProvider } from './backup/providers/mongo.backup.provider';

const handler = async (
  event?: APIGatewayProxyEventV2,
  _context?: Context,
  _callback?: CallableFunction,
): Promise<APIGatewayProxyResult> => {
  try {
    const backupProvider = container.resolve(MongoBackupProvider);
    console.log('creating backup...');
    const backupResult = await backupProvider.createBackup();
    console.log('Backup Result:', backupResult);
    return {
      statusCode: StatusCodes.OK,
      body: JSON.stringify({
        message: 'Backup created successfully',
        backupResult,
        input: event,
      }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      body: JSON.stringify({
        message: 'Internal Server Error',
      }),
    };
  }
};

export { handler };
