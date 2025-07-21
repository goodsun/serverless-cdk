# デプロイメントガイド

## 前提条件

### 必要なツール

- Node.js 18以上
- npm または yarn
- AWS CLI（設定済み）
- AWS CDK CLI

```bash
# AWS CDK CLIのインストール
npm install -g aws-cdk

# バージョン確認
cdk --version
```

### AWS認証情報

```bash
# AWS CLIの設定
aws configure

# プロファイルを使用する場合
export AWS_PROFILE=your-profile-name
```

## 初回セットアップ

### 1. プロジェクトの作成

プロジェクト作成手順は[README.md](../README.md#-クイックスタート)を参照してください。

### 2. 環境変数の設定

環境変数の設定方法は[共通コマンド集](COMMON_COMMANDS.md#環境変数設定)を参照してください。

### 3. CDKブートストラップ

初回のみ実行が必要：

```bash
# デフォルトリージョンでブートストラップ
cdk bootstrap

# 特定のリージョンでブートストラップ
cdk bootstrap aws://ACCOUNT-ID/REGION
```

## デプロイメント

### デプロイコマンド

各環境へのデプロイコマンドは[共通コマンド集](COMMON_COMMANDS.md#デプロイコマンド)を参照してください。

## デプロイオプション

### 差分確認

```bash
# 変更内容を確認（デプロイなし）
cdk diff

# 特定のスタックの差分確認
cdk diff my-app-dev
```

### CloudFormationテンプレート生成

```bash
# テンプレートの生成のみ
cdk synth

# 出力ディレクトリを指定
cdk synth -o ./cfn-templates
```

### ホットスワップデプロイ

Lambda関数のコードのみを高速更新：

```bash
# 開発環境でのホットスワップ
cdk deploy --hotswap

# 本番環境では非推奨
```

## マルチアカウント・マルチリージョン

### アカウント別デプロイ

```bash
# 開発アカウント
CDK_ACCOUNT=111111111111 CDK_ENV=dev npm run deploy

# 本番アカウント
CDK_ACCOUNT=222222222222 CDK_ENV=prod npm run deploy
```

### リージョン別デプロイ

```bash
# 東京リージョン
CDK_REGION=ap-northeast-1 npm run deploy

# シンガポールリージョン
CDK_REGION=ap-southeast-1 npm run deploy
```

## CI/CDパイプライン

### GitHub Actions例

```yaml
name: Deploy to AWS

on:
  push:
    branches:
      - main
      - develop

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ap-northeast-1
        
    - name: Deploy to Dev
      if: github.ref == 'refs/heads/develop'
      run: |
        CDK_ENV=dev npm run deploy
        
    - name: Deploy to Prod
      if: github.ref == 'refs/heads/main'
      run: |
        CDK_ENV=prod npm run deploy
```

## ロールバック

### 手動ロールバック

```bash
# CloudFormationコンソールから実行
# または以前のバージョンを再デプロイ

# 特定のコミットに戻す
git checkout <previous-commit>
npm run deploy:prod
```

### 自動ロールバック設定

Lambda関数のエラー率に基づく自動ロールバック：

```typescript
// CDKスタックで設定
new lambda.Alias(this, 'LiveAlias', {
  aliasName: 'live',
  version: lambdaFunction.currentVersion,
  // CloudWatchアラームによる自動ロールバック
});
```

## トラブルシューティング

### よくあるエラー

#### 1. 認証エラー

```
Error: Need to perform AWS calls for account 123456789012, but no credentials have been configured
```

**解決策**：
```bash
# AWS認証情報の確認
aws sts get-caller-identity

# プロファイルの指定
export AWS_PROFILE=your-profile
```

#### 2. ブートストラップエラー

CDKブートストラップエラーの解決方法は[トラブルシューティング](TROUBLESHOOTING.md#1-cdkブートストラップエラー)を参照してください。

#### 3. リソース制限エラー

```
Error: Maximum number of Lambdas reached
```

**解決策**：
- AWSサポートに制限緩和を申請
- 不要なリソースの削除

### デプロイログの確認

```bash
# CloudFormationイベントの確認
aws cloudformation describe-stack-events \
  --stack-name my-app-dev

# Lambda関数のログ確認
aws logs tail /aws/lambda/my-app-dev-api --follow
```

## ベストプラクティス

### 1. 環境変数の管理

```bash
# 環境別の.envファイル
.env.dev
.env.stg
.env.prod

# デプロイ時に読み込み
source .env.${CDK_ENV}
```

### 2. デプロイ前チェック

```bash
# デプロイ前スクリプト
#!/bin/bash
echo "Deploying to ${CDK_ENV} environment..."
echo "Account: $(aws sts get-caller-identity --query Account --output text)"
echo "Region: ${AWS_REGION}"
read -p "Continue? (y/n) " -n 1 -r
```

### 3. タグ付け戦略

```typescript
// 全リソースにタグを追加
cdk.Tags.of(app).add('Environment', environment);
cdk.Tags.of(app).add('Project', 'my-app');
cdk.Tags.of(app).add('ManagedBy', 'CDK');
```

## コスト管理

### デプロイ前のコスト見積もり

```bash
# AWS Pricing Calculatorを使用
# または、CloudFormationテンプレートから推定
```

### 不要なリソースの削除

```bash
# スタックの削除
cdk destroy my-app-dev

# 全リソースの削除（確認あり）
cdk destroy --all
```

## セキュリティ考慮事項

### 1. シークレット管理

```typescript
// AWS Secrets Managerの使用
const secret = secretsmanager.Secret.fromSecretNameV2(
  this, 'Secret', 'my-app/api-key'
);
```

### 2. 最小権限の原則

```typescript
// 必要最小限の権限のみ付与
role.addToPolicy(new iam.PolicyStatement({
  actions: ['dynamodb:GetItem'],
  resources: [table.tableArn],
}));
```

### 3. 監査ログ

```bash
# CloudTrailでデプロイアクティビティを記録
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=CreateStack
```