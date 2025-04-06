import { APIGatewayProxyEventV2, APIGatewayProxyResult, Context, LambdaFunctionURLHandler } from 'aws-lambda';
import { StatusCodes } from 'http-status-codes';

const handler= async (event?: APIGatewayProxyEventV2, _context?: Context, _callback?: CallableFunction): Promise<APIGatewayProxyResult> => {
  try {
    return {
      statusCode: StatusCodes.OK,
      body: JSON.stringify({
        message: 'Hello from Lambda!',
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