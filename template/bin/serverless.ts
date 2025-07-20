#!/usr/bin/env node
import 'dotenv/config';
import * as cdk from 'aws-cdk-lib';
import { ServerlessStack } from '../lib/serverless-stack';

const app = new cdk.App();

// 環境の決定（set-env.shで設定される）
const environment = process.env.CDK_ENV || 'dev';
const account = process.env.CDK_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_REGION || process.env.CDK_DEFAULT_REGION || 'ap-northeast-1';
const appName = process.env.APP_NAME || 'my-serverless-app';

// ドメイン設定（オプション）
const domainName = process.env.DOMAIN_NAME;
const apiSubdomain = process.env.API_SUBDOMAIN;

new ServerlessStack(app, `${appName}-${environment}`, {
  env: { account, region },
  appName: appName,
  environment: environment,
  domainName: domainName,
});