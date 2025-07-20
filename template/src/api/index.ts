import serverlessExpress from '@codegenie/serverless-express';
import { APIGatewayProxyHandler } from 'aws-lambda';
import { app } from './app';

let serverlessExpressInstance: any;

export const handler: APIGatewayProxyHandler = async (event, context) => {
  if (!serverlessExpressInstance) {
    serverlessExpressInstance = serverlessExpress({ app });
  }

  return serverlessExpressInstance(event, context);
};