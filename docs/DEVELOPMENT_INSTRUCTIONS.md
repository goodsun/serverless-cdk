# serverless-cdk 開発指示書

## 🎯 プロジェクトの目的
shareNOTEプロジェクトで実証されたサーバーレスアーキテクチャを、再利用可能なテンプレートとして提供する。

## 📋 Phase 1: MVPの作成（今すぐ実行）

### 1. shareNOTEからのコード抽出

#### 必要なファイル
```bash
# CDKインフラ定義
sharenote/lib/sharenote-stack.ts → template/lib/serverless-stack.ts
sharenote/bin/sharenote.ts → template/bin/serverless.ts

# Lambda関数
sharenote/src/handler.ts → template/src/handler.ts（最小限に簡略化）

# 設定ファイル
sharenote/package.json → template/package.json（依存関係を整理）
sharenote/tsconfig.json → template/tsconfig.json
sharenote/.gitignore → template/.gitignore
```

#### 抽出時の注意点
- shareNOTE固有のロジックを削除
- 汎用的なCRUD操作のみ残す
- 環境変数はプレースホルダー化
- Alexa関連のコードは一旦除外

### 2. テンプレートの汎用化

#### DynamoDBテーブル定義
```typescript
// 汎用的なテーブル構造に変更
const table = new dynamodb.Table(this, 'MainTable', {
  partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
  tableName: `${props.appName}-${props.environment}-table`
});
```

#### Lambda関数の簡略化
```typescript
// 基本的なCRUD操作のみ
export const handler = async (event: APIGatewayProxyEvent) => {
  switch (event.httpMethod) {
    case 'GET':
      return handleGet(event);
    case 'POST':
      return handlePost(event);
    case 'PUT':
      return handlePut(event);
    case 'DELETE':
      return handleDelete(event);
  }
};
```

#### S3バケットの追加
```typescript
const bucket = new s3.Bucket(this, 'StorageBucket', {
  bucketName: `${props.appName}-${props.environment}-storage`,
  cors: [{
    allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
    allowedOrigins: ['*'],
    allowedHeaders: ['*'],
  }],
});
```

### 3. CLIツールの作成

#### bin/create-serverless-cdk.js
```javascript
#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

const projectName = process.argv[2] || 'my-serverless-app';
const templateDir = path.join(__dirname, '..', 'template');
const targetDir = path.join(process.cwd(), projectName);

console.log(`🚀 Creating ${projectName}...`);

// テンプレートをコピー
fs.copySync(templateDir, targetDir);

// package.jsonを更新
const packageJson = require(path.join(targetDir, 'package.json'));
packageJson.name = projectName;
fs.writeJsonSync(path.join(targetDir, 'package.json'), packageJson, { spaces: 2 });

// .envファイルを作成
fs.copySync(
  path.join(targetDir, '.env.example'),
  path.join(targetDir, '.env')
);

console.log(`
✅ Project created successfully!

Next steps:
  cd ${projectName}
  npm install
  npm run deploy:dev
`);
```

### 4. 環境変数管理システム

#### .env.example
```
APP_NAME=my-serverless-app
AWS_REGION=ap-northeast-1
LOG_LEVEL=info
```

#### .env.schema.yml
```yaml
environment_variables:
  - name: APP_NAME
    required: true
    description: "Application name used for resource naming"
    
  - name: AWS_REGION
    required: true
    default: "ap-northeast-1"
    description: "AWS region for deployment"
    
  - name: LOG_LEVEL
    required: false
    default: "info"
    description: "Logging level"
```

## 📋 Phase 2: 価値の追加（MVP完成後）

### 1. デプロイスクリプトの強化
- 環境別デプロイ戦略の実装
- smart-deploy.shの作成

### 2. ドキュメントテンプレート
- API.md（自動生成）
- DEPLOYMENT.md
- ARCHITECTURE.md

### 3. GitHub Actions設定
- .github/workflows/deploy.yml
- 環境変数チェック

## 🚀 実装手順

### Step 1: 基本構造（30分）
```bash
cd /Users/goodsun/develop/claude/serverless-cdk

# READMEを作成
echo "# serverless-cdk" > README.md
echo "Work in progress..." >> README.md

# package.jsonを作成
npm init -y
npm install -D @types/node typescript
```

### Step 2: shareNOTEからの抽出（1時間）
1. shareNOTEリポジトリをクローン/参照
2. 必要なファイルをtemplateディレクトリにコピー
3. shareNOTE固有のコードを削除
4. 汎用的な形に修正

### Step 3: CLIツール作成（30分）
1. bin/create-serverless-cdk.jsを作成
2. 実行権限を付与
3. package.jsonにbinフィールドを追加

### Step 4: テスト（30分）
```bash
# ローカルでテスト
node bin/create-serverless-cdk.js test-app
cd test-app
npm install
npm run deploy:dev
```

## ⚠️ 注意事項

### やること
- ✅ 最小限の動くものを作る
- ✅ 自分で実際に使ってみる
- ✅ フィードバックを元に改善

### やらないこと
- ❌ 最初から完璧を目指す
- ❌ 使わない機能を先に作る
- ❌ 過度な抽象化

## 🎯 成功の定義
1. `npx create-serverless-cdk my-app` でプロジェクトが作成できる
2. `npm run deploy:dev` でAWSにデプロイできる
3. 基本的なCRUD APIが動作する
4. 次のプロジェクトで実際に使える

## 📅 タイムライン
- **今日**: MVP作成（2-3時間）
- **明日**: 自分のプロジェクトで実際に使用
- **週末**: フィードバックを元に改善
- **来週**: npm公開を検討