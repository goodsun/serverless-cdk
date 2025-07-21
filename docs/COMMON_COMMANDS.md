# 共通コマンド集

このドキュメントには、serverless-cdkプロジェクトで頻繁に使用するコマンドをまとめています。

## AWS関連コマンド

### AWSアカウントID取得
```bash
aws sts get-caller-identity --query Account --output text
```

### AWS認証情報確認
```bash
aws configure list
```

### リージョン設定
```bash
aws configure set region ap-northeast-1
```

## CDK関連コマンド

### CDKブートストラップ
```bash
npx cdk bootstrap
```

### デプロイコマンド

#### 開発環境
```bash
npm run deploy:dev
```

#### ステージング環境
```bash
npm run deploy:staging
```

#### 本番環境
```bash
npm run deploy:prod
```

### スタック一覧表示
```bash
npx cdk list
```

### 差分確認
```bash
npx cdk diff
```

### スタック削除
```bash
npx cdk destroy --all
```

## プロジェクト初期化

### serverless-cdkでプロジェクト作成
```bash
npx create-serverless-cdk@latest my-serverless-app
cd my-serverless-app
```

### 依存関係インストール
```bash
npm install
```

## 環境変数設定

### .envファイルの基本形
```bash
# プロジェクト名
PROJECT_NAME=my-serverless-app

# AWSアカウントID
AWS_ACCOUNT_ID=123456789012

# デプロイリージョン
AWS_REGION=ap-northeast-1
```

## GitHub Actions関連

### シークレット設定確認
```bash
gh secret list
```

### シークレット設定
```bash
gh secret set AWS_ACCESS_KEY_ID
gh secret set AWS_SECRET_ACCESS_KEY
```

## トラブルシューティング

### CDKブートストラップエラーの解決
```bash
# 既存のブートストラップスタックを削除
aws cloudformation delete-stack --stack-name CDKToolkit --region ap-northeast-1

# 削除完了を待つ
aws cloudformation wait stack-delete-complete --stack-name CDKToolkit --region ap-northeast-1

# 再度ブートストラップ
npx cdk bootstrap
```

### キャッシュクリア
```bash
rm -rf node_modules package-lock.json
npm install
```

## 開発用コマンド

### TypeScriptビルド
```bash
npm run build
```

### テスト実行
```bash
npm test
```

### Lintチェック
```bash
npm run lint
```

### 型チェック
```bash
npm run typecheck
```

## Lambda関数のローカル実行

### SAM CLIを使用
```bash
sam local start-api
```

### 特定の関数を実行
```bash
sam local invoke HelloWorldFunction
```

## ログ確認

### CloudWatch Logsの確認
```bash
aws logs tail /aws/lambda/my-function --follow
```

### 最新のログを取得
```bash
aws logs filter-log-events --log-group-name /aws/lambda/my-function --max-items 20
```