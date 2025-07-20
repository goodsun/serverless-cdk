import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import * as fs from 'fs';

export interface ServerlessStackProps extends cdk.StackProps {
  appName: string;
  environment: string;
  domainName?: string;
}

export class ServerlessStack extends cdk.Stack {
  public readonly mainTable: dynamodb.Table;
  public readonly apiLambda: lambda.Function;
  public readonly api: apigateway.RestApi;
  public readonly storageBucket: s3.Bucket;
  public readonly frontendBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: ServerlessStackProps) {
    super(scope, id, props);

    const { appName, environment, domainName } = props;
    const serviceName = `${appName}-${environment}`;

    // Main DynamoDB Table with generic single-table design
    this.mainTable = new dynamodb.Table(this, 'MainTable', {
      tableName: `${serviceName}-table`,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: process.env.ENABLE_PITR === 'true',
      removalPolicy: environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
    });

    // Global Secondary Index for queries
    this.mainTable.addGlobalSecondaryIndex({
      indexName: 'gsi1',
      partitionKey: { name: 'gsi1pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'gsi1sk', type: dynamodb.AttributeType.STRING },
    });

    // Storage Bucket for files/assets
    this.storageBucket = new s3.Bucket(this, 'StorageBucket', {
      bucketName: `${serviceName}-storage`,
      cors: [{
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST, s3.HttpMethods.DELETE],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
        maxAge: 3000,
      }],
      removalPolicy: environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: environment !== 'prod',
    });

    // IAM Role for Lambda
    const lambdaRole = new iam.Role(this, 'LambdaRole', {
      roleName: `${serviceName}-lambda-role`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Grant permissions
    this.mainTable.grantReadWriteData(lambdaRole);
    this.storageBucket.grantReadWrite(lambdaRole);

    // CloudWatch Log Group (明示的に作成して削除ポリシーを制御)
    const logGroup = new logs.LogGroup(this, 'ApiLogGroup', {
      logGroupName: `/aws/lambda/${serviceName}-api`,
      retention: environment === 'prod' 
        ? logs.RetentionDays.THREE_MONTHS 
        : logs.RetentionDays.ONE_WEEK,
      removalPolicy: environment === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    // API Lambda Function
    this.apiLambda = new lambda.Function(this, 'ApiHandler', {
      functionName: `${serviceName}-api`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('dist/api'),
      role: lambdaRole,
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      environment: {
        TABLE_NAME: this.mainTable.tableName,
        BUCKET_NAME: this.storageBucket.bucketName,
        ENVIRONMENT: environment,
        LOG_LEVEL: process.env.LOG_LEVEL || 'info',
        APP_NAME: appName,
        // Optional configurations
        ...(process.env.ENCRYPTION_KEY && { ENCRYPTION_KEY: process.env.ENCRYPTION_KEY }),
        ...(process.env.SLACK_WEBHOOK_URL && { SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL }),
      },
      logGroup: logGroup,
    });

    // API Gateway REST API
    this.api = new apigateway.RestApi(this, 'Api', {
      restApiName: `${serviceName}-api`,
      deployOptions: {
        stageName: 'api',  // 固定のステージ名を使用
        cachingEnabled: process.env.ENABLE_API_CACHE === 'true',
        cacheClusterEnabled: process.env.ENABLE_API_CACHE === 'true',
        cacheClusterSize: process.env.ENABLE_API_CACHE === 'true' ? '0.5' : undefined,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization', 'X-Amz-Date', 'X-Api-Key', 'X-Amz-Security-Token'],
        allowCredentials: true,
      },
    });

    // API routes setup
    // Items resource for CRUD operations
    const itemsResource = this.api.root.addResource('items');
    
    // GET /items - List items
    itemsResource.addMethod('GET', new apigateway.LambdaIntegration(this.apiLambda));
    
    // POST /items - Create item
    itemsResource.addMethod('POST', new apigateway.LambdaIntegration(this.apiLambda));
    
    // Single item operations
    const itemResource = itemsResource.addResource('{id}');
    
    // GET /items/{id} - Get single item
    itemResource.addMethod('GET', new apigateway.LambdaIntegration(this.apiLambda));
    
    // PUT /items/{id} - Update item
    itemResource.addMethod('PUT', new apigateway.LambdaIntegration(this.apiLambda));
    
    // DELETE /items/{id} - Delete item
    itemResource.addMethod('DELETE', new apigateway.LambdaIntegration(this.apiLambda));
    
    // Health check endpoint
    const healthResource = this.api.root.addResource('health');
    healthResource.addMethod('GET', new apigateway.LambdaIntegration(this.apiLambda));

    // API Gateway Custom Domain (if certificate ARN is provided)
    const apiCertificateArn = process.env.API_CERTIFICATE_ARN || 
      (process.env.USE_SHARED_CERTIFICATE === 'true' ? 
        ssm.StringParameter.valueForStringParameter(this, '/acm/regional-certificate-arn') : 
        undefined);

    if (domainName && apiCertificateArn) {
      const certificate = acm.Certificate.fromCertificateArn(
        this, 'ApiCertificate', apiCertificateArn
      );

      const fullDomainName = process.env.API_SUBDOMAIN 
        ? `${process.env.API_SUBDOMAIN}.${domainName}`
        : `${appName}.${domainName}`;
        
      const apiDomainName = new apigateway.DomainName(this, 'ApiDomainName', {
        domainName: fullDomainName,
        certificate: certificate,
      });

      new apigateway.BasePathMapping(this, 'ApiBasePathMapping', {
        domainName: apiDomainName,
        restApi: this.api,
      });

      new cdk.CfnOutput(this, 'ApiCustomDomain', {
        value: `${appName}.${domainName}`,
        description: 'API custom domain',
      });

      new cdk.CfnOutput(this, 'ApiDomainCNAME', {
        value: apiDomainName.domainNameAliasDomainName,
        description: 'CNAME target for API custom domain',
      });
    }

    // Frontend Bucket (Optional - for simple admin UI or static assets)
    this.frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: `${serviceName}-frontend`,
      publicReadAccess: true,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      }),
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'error.html',
      removalPolicy: environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: environment !== 'prod',
    });

    // Deploy frontend files if they exist
    if (fs.existsSync('./build/frontend')) {
      new s3deploy.BucketDeployment(this, 'FrontendDeployment', {
        sources: [s3deploy.Source.asset('./build/frontend')],
        destinationBucket: this.frontendBucket,
        retainOnDelete: false,
      });
    }

    // Stack Outputs
    new cdk.CfnOutput(this, 'TableName', {
      value: this.mainTable.tableName,
      description: 'DynamoDB table name',
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'API Gateway endpoint URL',
    });

    new cdk.CfnOutput(this, 'ApiHealthCheckUrl', {
      value: `${this.api.url}health`,
      description: 'API Health Check URL',
    });

    new cdk.CfnOutput(this, 'StorageBucketName', {
      value: this.storageBucket.bucketName,
      description: 'S3 storage bucket name',
    });

    new cdk.CfnOutput(this, 'FrontendUrl', {
      value: this.frontendBucket.bucketWebsiteUrl,
      description: 'Frontend S3 website URL',
    });

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: this.frontendBucket.bucketName,
      description: 'S3 bucket name for frontend deployment',
    });

    // タグ付け
    cdk.Tags.of(this).add('Service', appName);
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('ManagedBy', 'serverless-cdk');
  }
}