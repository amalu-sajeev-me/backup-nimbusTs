import { singleton } from 'tsyringe';
import { APIGatewayProxyResult } from 'aws-lambda';
import { StatusCodes } from 'http-status-codes';
import { ApplicationError } from './application-error';

@singleton()
export class ErrorHandler {
  handleError(error: Error | ApplicationError | unknown): APIGatewayProxyResult {
    console.error('Error caught by error handler:', error);
    
    // If it's our custom application error
    if (error instanceof ApplicationError) {
      return {
        statusCode: error.statusCode,
        body: JSON.stringify(error.toJSON()),
        headers: {
          'Content-Type': 'application/json',
        },
      };
    }
    
    // If it's a standard Error object
    if (error instanceof Error) {
      const appError = new ApplicationError(
        error.message || 'An unexpected error occurred',
        StatusCodes.INTERNAL_SERVER_ERROR,
        'INTERNAL_SERVER_ERROR',
        { cause: error }
      );
      
      console.error('Original error stack:', error.stack);
      
      return {
        statusCode: appError.statusCode,
        body: JSON.stringify(appError.toJSON()),
        headers: {
          'Content-Type': 'application/json',
        },
      };
    }
    
    // Unknown error type
    const appError = new ApplicationError(
      'An unexpected error occurred',
      StatusCodes.INTERNAL_SERVER_ERROR,
      'INTERNAL_SERVER_ERROR',
      { cause: error }
    );
    
    return {
      statusCode: appError.statusCode,
      body: JSON.stringify(appError.toJSON()),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }
}