import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

export class DynamoDBService {
  private client: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    const ddbClient = new DynamoDBClient({
      region: process.env.AWS_REGION || 'ap-northeast-1',
    });
    
    this.client = DynamoDBDocumentClient.from(ddbClient, {
      marshallOptions: {
        removeUndefinedValues: true,
      },
    });
    
    this.tableName = process.env.TABLE_NAME || 'serverless-table';
  }

  async getItem(id: string): Promise<any> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        pk: `ITEM#${id}`,
        sk: `ITEM#${id}`,
      },
    });

    const response = await this.client.send(command);
    return response.Item;
  }

  async createItem(item: any): Promise<void> {
    const command = new PutCommand({
      TableName: this.tableName,
      Item: {
        pk: `ITEM#${item.id}`,
        sk: `ITEM#${item.id}`,
        gsi1pk: `TYPE#${item.type}`,
        gsi1sk: `CREATED#${item.createdAt}`,
        ...item,
      },
    });

    await this.client.send(command);
  }

  async updateItem(item: any): Promise<void> {
    return this.createItem(item);
  }

  async deleteItem(id: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: {
        pk: `ITEM#${id}`,
        sk: `ITEM#${id}`,
      },
    });

    await this.client.send(command);
  }

  async queryItems(type: string): Promise<any[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: 'gsi1',
      KeyConditionExpression: 'gsi1pk = :type',
      ExpressionAttributeValues: {
        ':type': `TYPE#${type}`,
      },
      ScanIndexForward: false,
    });

    const response = await this.client.send(command);
    return response.Items || [];
  }
}