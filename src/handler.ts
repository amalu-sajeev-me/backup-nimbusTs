import { APIGatewayProxyEventV2, APIGatewayProxyResult, Context } from 'aws-lambda';
import { container } from 'tsyringe';
import { HandlerService } from './services/handler.service';

// Simplified handler that delegates to the service
const handler = async (
  event?: APIGatewayProxyEventV2,
  context?: Context,
): Promise<APIGatewayProxyResult> => {
  const handlerService = container.resolve(HandlerService);
  return handlerService.processEvent(event, context);
};

export { handler };
