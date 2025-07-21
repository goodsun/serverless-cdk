# トラブルシューティングガイド

## よくある問題と解決方法

### デプロイ関連

#### 1. CDKブートストラップエラー

**エラーメッセージ**
```
Error: This stack uses assets, so the toolkit stack must be deployed to the environment
```

**原因**
CDKツールキットスタックがデプロイされていない

**解決方法**
```bash
# package.jsonに定義されている場合
npm run bootstrap

# CDKコマンドで直接実行（デフォルトアカウント/リージョン）
cdk bootstrap

# 特定のアカウント/リージョンでブートストラップ
cdk bootstrap aws://ACCOUNT-ID/REGION

# 例：東京リージョンの場合
cdk bootstrap aws://123456789012/ap-northeast-1

# アカウントIDが不明な場合は確認
aws sts get-caller-identity --query Account --output text

# 特定のプロファイルを使用する場合
export AWS_PROFILE=your-profile-name
cdk bootstrap
```

**既存のブートストラップスタックでエラーが発生する場合**
```bash
# 既存のブートストラップスタックを削除
aws cloudformation delete-stack --stack-name CDKToolkit --region ap-northeast-1

# 削除完了を待つ
aws cloudformation wait stack-delete-complete --stack-name CDKToolkit --region ap-northeast-1

# 再度ブートストラップ
cdk bootstrap
```

#### 2. IAM権限エラー

**エラーメッセージ**
```
Error: User: arn:aws:iam::123456789012:user/username is not authorized to perform: cloudformation:CreateStack
```

**原因**
AWS CLIユーザーに必要な権限がない

**解決方法**
以下の権限を持つIAMポリシーを追加：
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:*",
        "iam:*",
        "lambda:*",
        "apigateway:*",
        "dynamodb:*",
        "s3:*",
        "logs:*"
      ],
      "Resource": "*"
    }
  ]
}
```

#### 3. リージョン不一致エラー

**エラーメッセージ**
```
Error: Stack is in CREATE_FAILED state and cannot be updated
```

**原因**
異なるリージョンにデプロイしようとしている

**解決方法**
```bash
# 正しいリージョンを指定
export AWS_REGION=ap-northeast-1
export CDK_REGION=ap-northeast-1

# スタックを削除してから再デプロイ
cdk destroy
cdk deploy
```

### Lambda関連

#### 1. タイムアウトエラー

**エラーメッセージ**
```
Task timed out after 30.00 seconds
```

**原因**
- 処理に時間がかかりすぎている
- 外部APIの応答が遅い
- データベースクエリが最適化されていない

**解決方法**
```typescript
// CDKでタイムアウトを延長
new lambda.Function(this, 'ApiHandler', {
  // ...
  timeout: cdk.Duration.seconds(60), // 60秒に延長
});
```

#### 2. メモリ不足エラー

**エラーメッセージ**
```
Runtime exited with error: signal: killed
```

**原因**
Lambda関数のメモリが不足

**解決方法**
```typescript
// メモリサイズを増やす
new lambda.Function(this, 'ApiHandler', {
  // ...
  memorySize: 512, // 512MBに増加
});
```

#### 3. コールドスタート問題

**症状**
初回リクエストの応答が遅い

**解決方法**
```typescript
// 予約同時実行数を設定
const fn = new lambda.Function(this, 'ApiHandler', {
  // ...
  reservedConcurrentExecutions: 5,
});

// または、プロビジョニングされた同時実行を使用
const alias = new lambda.Alias(this, 'LiveAlias', {
  aliasName: 'live',
  version: fn.currentVersion,
  provisionedConcurrentExecutions: 2,
});
```

### DynamoDB関連

#### 1. スロットリングエラー

**エラーメッセージ**
```
ProvisionedThroughputExceededException: The level of configured provisioned throughput for the table was exceeded
```

**原因**
読み書きキャパシティを超過

**解決方法**
```typescript
// オンデマンドモードに変更
new dynamodb.Table(this, 'MainTable', {
  // ...
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
});
```

#### 2. アイテムサイズ超過

**エラーメッセージ**
```
ValidationException: Item size has exceeded the maximum allowed size
```

**原因**
DynamoDBアイテムの最大サイズ（400KB）を超過

**解決方法**
- 大きなデータはS3に保存し、参照のみDynamoDBに保存
- データを圧縮して保存
- 複数のアイテムに分割

### API Gateway関連

#### 1. CORS エラー

**エラーメッセージ（ブラウザコンソール）**
```
Access to fetch at 'https://api.example.com' from origin 'http://localhost:3000' has been blocked by CORS policy
```

**解決方法**
```typescript
// CDKでCORS設定を追加
const api = new apigateway.RestApi(this, 'Api', {
  defaultCorsPreflightOptions: {
    allowOrigins: apigateway.Cors.ALL_ORIGINS,
    allowMethods: apigateway.Cors.ALL_METHODS,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowCredentials: true,
  },
});
```

#### 2. ペイロードサイズ超過

**エラーメッセージ**
```
413 Request Entity Too Large
```

**原因**
API Gatewayのペイロード制限（10MB）を超過

**解決方法**
- 大きなファイルは直接S3にアップロード
- データを分割して送信
- 圧縮してから送信

### ビルド・開発関連

#### 1. TypeScriptコンパイルエラー

**エラーメッセージ**
```
error TS2339: Property 'xxx' does not exist on type 'yyy'
```

**解決方法**
```bash
# 型定義ファイルをインストール
npm install --save-dev @types/node @types/express

# tsconfig.jsonの確認
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

#### 2. パッケージバージョン競合

**エラーメッセージ**
```
npm ERR! peer dep missing: xxx, required by yyy
```

**解決方法**
```bash
# package-lock.jsonを削除して再インストール
rm package-lock.json
rm -rf node_modules
npm install

# または、強制インストール
npm install --force
```

### 環境変数関連

#### 1. 環境変数が読み込まれない

**症状**
`process.env.XXX`が`undefined`

**解決方法**
```bash
# .envファイルの確認
cat .env

# dotenvが正しく設定されているか確認
npm install dotenv

# コードで読み込み
require('dotenv').config();
```

#### 2. 本番環境で環境変数が異なる

**解決方法**
```bash
# 環境別の.envファイルを作成
.env.dev
.env.stg
.env.prod

# デプロイ時に指定
CDK_ENV=prod npm run deploy
```

## デバッグ手法

### 1. CloudWatchログの確認

```bash
# Lambda関数のログを確認
aws logs tail /aws/lambda/my-app-dev-api --follow

# 特定の時間範囲のログを取得
aws logs filter-log-events \
  --log-group-name /aws/lambda/my-app-dev-api \
  --start-time 1642000000000 \
  --end-time 1642086400000
```

### 2. ローカルでのテスト

```bash
# SAM CLIを使用したローカルテスト
sam local start-api

# CDKアプリケーションのローカル実行
npm install -g aws-cdk-local
cdklocal deploy
```

### 3. X-Rayトレーシング

```typescript
// Lambda関数でX-Rayを有効化
new lambda.Function(this, 'ApiHandler', {
  // ...
  tracing: lambda.Tracing.ACTIVE,
});
```

## パフォーマンス最適化

### 1. Lambda関数の最適化

```typescript
// 接続の再利用
const dynamoClient = new DynamoDBClient({});

// ハンドラーの外で初期化
export const handler = async (event) => {
  // 処理
};
```

### 2. DynamoDBクエリの最適化

```typescript
// 効率的なクエリ
const command = new QueryCommand({
  TableName: tableName,
  IndexName: 'gsi1',
  KeyConditionExpression: 'gsi1pk = :pk',
  ExpressionAttributeValues: {
    ':pk': 'TYPE#product',
  },
  Limit: 10, // 必要な分だけ取得
});
```

## サポート

### ログの収集

問題報告時は以下の情報を含めてください：

1. エラーメッセージ全文
2. 実行したコマンド
3. 環境情報（OS、Node.jsバージョン、CDKバージョン）
4. 関連するCloudWatchログ

```bash
# 環境情報の収集
node --version
npm --version
cdk --version
aws --version
```

### コミュニティサポート

- GitHub Issues: バグ報告や機能要望
- Stack Overflow: 技術的な質問
- AWS Developer Forums: AWS固有の問題