# API開発ガイド

## 概要

このガイドでは、serverless-cdkを使用したAPI開発の詳細な手順を説明します。

## 🏗️ APIアーキテクチャ

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Client    │────▶│ API Gateway  │────▶│   Lambda     │
└─────────────┘     └──────────────┘     └──────────────┘
                                                 │
                                          ┌──────┴───────┐
                                          ▼              ▼
                                   ┌──────────────┐ ┌──────────────┐
                                   │  DynamoDB    │ │     S3       │
                                   └──────────────┘ └──────────────┘
```

## 📁 APIプロジェクト構造

```
src/api/
├── index.ts           # Lambda関数のエントリーポイント（serverless-express使用）
├── app.ts             # Expressアプリケーション設定
├── routes/            # APIルート定義
│   ├── health.ts     # ヘルスチェック
│   └── items.ts      # アイテムCRUD操作
├── services/          # ビジネスロジック
│   └── dynamodb.ts   # DynamoDBアクセス層（シングルテーブル設計）
└── middleware/        # ミドルウェア
    └── error-handler.ts  # エラーハンドリング
```

## 🚀 開発フロー

### 1. 環境セットアップ

```bash
# 新規プロジェクト作成
create-serverless-cdk my-api
cd my-api

# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env
# .envファイルを編集（CDK_DEFAULT_ACCOUNTなど必須項目を設定）
```

### 2. ローカル開発

#### TypeScriptの監視モード
```bash
npm run watch
```

#### ローカルAPIサーバーの起動（sam local使用）
```bash
# SAM CLIのインストール（初回のみ）
brew install aws-sam-cli

# ローカルAPI起動
sam local start-api --template cdk.out/your-stack-name.template.json
```

### 3. 新しいエンドポイントの追加

#### ステップ1: ルートファイルの作成
```typescript
// src/api/routes/users.ts
import { Router } from 'express';
import { DynamoDBService } from '../services/dynamodb';

const router = Router();
const dynamoService = new DynamoDBService();

// GET /users
router.get('/', async (req, res) => {
  try {
    const users = await dynamoService.getAllItems('users');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /users/:id
router.get('/:id', async (req, res) => {
  try {
    const user = await dynamoService.getItem('users', req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /users
router.post('/', async (req, res) => {
  try {
    const newUser = await dynamoService.createItem('users', req.body);
    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

export default router;
```

#### ステップ2: ルートの登録
```typescript
// src/api/app.ts に直接追加
import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health';
import itemsRouter from './routes/items';
import usersRouter from './routes/users';  // 新規追加
import { errorHandler } from './middleware/error-handler';

const app = express();

// ミドルウェア
app.use(cors());
app.use(express.json());

// ルート
app.use('/health', healthRouter);
app.use('/items', itemsRouter);
app.use('/users', usersRouter);   // 新規追加

// エラーハンドリング
app.use(errorHandler);

export { app };
```

### 4. DynamoDBサービスの実装

```typescript
// src/api/services/dynamodb.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

export class DynamoDBService {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || 'ap-northeast-1'
    });
    this.docClient = DynamoDBDocumentClient.from(client);
    this.tableName = process.env.DYNAMODB_TABLE_NAME || 'serverless-table';
  }

  async getItem(pk: string, sk: string) {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: { pk, sk }
    });
    const response = await this.docClient.send(command);
    return response.Item;
  }

  async createItem(type: string, data: any) {
    const item = {
      pk: type,
      sk: `${type}#${Date.now()}#${Math.random().toString(36).substr(2, 9)}`,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const command = new PutCommand({
      TableName: this.tableName,
      Item: item
    });
    
    await this.docClient.send(command);
    return item;
  }

  async getAllItems(type: string) {
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: {
        ':pk': type
      }
    });
    
    const response = await this.docClient.send(command);
    return response.Items || [];
  }
}
```

### 5. エラーハンドリング

```typescript
// src/api/middleware/error.ts
import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: message,
    timestamp: new Date().toISOString(),
    path: req.path
  });
}
```

### 6. CORS設定

```typescript
// src/api/middleware/cors.ts
import cors from 'cors';

export const corsOptions: cors.CorsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
```

## 🧪 テスト

### ユニットテスト
```bash
npm test
```

### 統合テスト
```typescript
// __tests__/api/health.test.ts
import request from 'supertest';
import { app } from '../../src/api/app';

describe('Health Check', () => {
  it('should return 200 OK', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);
    
    expect(response.body).toHaveProperty('status', 'healthy');
  });
});
```

### APIテスト（HTTPie使用）
```bash
# ヘルスチェック
http GET https://your-api-url/health

# アイテム一覧取得
http GET https://your-api-url/items

# アイテム作成
http POST https://your-api-url/items \
  name="テストアイテム" \
  description="これはテストです"

# アイテム取得
http GET https://your-api-url/items/item-id

# アイテム更新
http PUT https://your-api-url/items/item-id \
  name="更新されたアイテム"

# アイテム削除
http DELETE https://your-api-url/items/item-id
```

## 🚀 デプロイ

### 開発環境へのデプロイ
```bash
# TypeScriptのビルド
npm run build

# Lambda関数のビルド
npm run build:api

# デプロイ
npm run deploy:dev
```

### 本番環境へのデプロイ
```bash
# 環境変数の確認
cat .env

# 本番用の設定確認
CDK_ENV=prod npm run synth

# デプロイ
npm run deploy:prod
```

## 📊 モニタリング

### CloudWatch Logs
```bash
# 最新のログを確認
aws logs tail /aws/lambda/your-function-name --follow

# エラーログの検索
aws logs filter-log-events \
  --log-group-name /aws/lambda/your-function-name \
  --filter-pattern "ERROR"
```

### X-Ray トレーシング

CDKスタックでX-Rayトレーシングを有効化：

```typescript
// lib/serverless-stack.ts
import * as lambda from 'aws-cdk-lib/aws-lambda';

const apiFunction = new lambda.Function(this, 'ApiFunction', {
  // ... 他の設定
  tracing: lambda.Tracing.ACTIVE, // X-Rayトレーシングを有効化
});
```

## 🔧 トラブルシューティング

### よくある問題

#### 1. CORS エラー
```
Access to XMLHttpRequest at 'https://api.example.com' from origin 'http://localhost:3000' has been blocked by CORS policy
```

**解決方法**：
- API Gatewayの設定でCORSを有効化
- Lambda関数のレスポンスヘッダーにCORSヘッダーを追加

#### 2. 認証トークンエラー
```json
{"message":"Missing Authentication Token"}
```

**原因**：
- URLパスの間違い（例：`/helth` → `/health`）
- HTTPメソッドの間違い
- API Gatewayのデプロイ忘れ

#### 3. Lambda タイムアウト
```
Task timed out after 3.00 seconds
```

**解決方法**：
- Lambda関数のタイムアウト値を増やす
- DynamoDBクエリの最適化
- コールドスタート対策の実装

## 🔐 セキュリティベストプラクティス

### 1. 環境変数の管理
```typescript
// 環境変数の検証
const requiredEnvVars = ['DYNAMODB_TABLE_NAME', 'AWS_REGION'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}
```

### 2. 入力値の検証
```typescript
import { body, validationResult } from 'express-validator';

// バリデーションミドルウェア
export const validateCreateItem = [
  body('name').isString().notEmpty(),
  body('description').isString().optional(),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];
```

### 3. レート制限
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100 // リクエスト数の上限
});

app.use('/api/', limiter);
```

## 📚 参考リンク

- [AWS Lambda ベストプラクティス](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [Express.js ドキュメント](https://expressjs.com/ja/)
- [DynamoDB 設計パターン](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [API Gateway 開発者ガイド](https://docs.aws.amazon.com/apigateway/latest/developerguide/welcome.html)