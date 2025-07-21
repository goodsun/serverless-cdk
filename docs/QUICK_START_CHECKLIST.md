# クイックスタートチェックリスト

`serverless-cdk`を使い始めるための事前準備チェックリストです。

## ✅ 事前準備チェックリスト

### 🖥️ ローカル環境

- [ ] Node.js v18以上がインストールされている
  ```bash
  node --version
  ```

- [ ] AWS CLIがインストールされている
  ```bash
  aws --version
  ```

- [ ] AWS CLIが設定されている
  ```bash
  aws sts get-caller-identity
  ```

- [ ] AWS CDKがインストールされている
  ```bash
  npm install -g aws-cdk
  cdk --version
  ```

### 🔐 AWS設定

- [ ] AWSアカウントを持っている
- [ ] IAMユーザーが作成されている
- [ ] アクセスキーとシークレットキーを取得している
- [ ] 必要なIAM権限が付与されている
  - CloudFormation
  - Lambda
  - API Gateway
  - DynamoDB
  - S3
  - IAM（ロール作成用）

### 🐙 GitHub設定

- [ ] GitHubアカウントを持っている
- [ ] GitHubで新規リポジトリを作成できる
- [ ] Git CLIがインストールされている
  ```bash
  git --version
  ```

## 🚀 プロジェクト開始手順

### 1️⃣ CLIツールのインストール
```bash
npm install -g create-serverless-cdk
```

### 2️⃣ プロジェクトの作成
プロジェクト作成手順の詳細は[README.md](../README.md#-クイックスタート)を参照してください。

### 3️⃣ 環境変数の設定
環境変数の設定方法の詳細は[共通コマンド集](COMMON_COMMANDS.md#環境変数設定)を参照してください。
AWSアカウントIDの取得方法は[共通コマンド集](COMMON_COMMANDS.md#awsアカウントid取得)を参照してください。

### 4️⃣ 初回セットアップ
```bash
# 依存関係のインストール
npm install

# CDKブートストラップ（初回のみ）
npm run bootstrap

# ローカルデプロイテスト
npm run deploy:dev
```

### 5️⃣ GitHub連携（オプション）
```bash
# Gitリポジトリ初期化
git init
git add .
git commit -m "Initial commit"

# GitHubにプッシュ
git remote add origin https://github.com/username/my-awesome-api.git
git push -u origin main
```

## 🆘 困ったときは

### よくある問題

1. **AWS認証エラー**
   ```
   The security token included in the request is invalid
   ```
   → `aws configure`を実行して認証情報を再設定

2. **CDKブートストラップエラー**
   → [トラブルシューティング](TROUBLESHOOTING.md#1-cdkブートストラップエラー)を参照

3. **権限エラー**
   ```
   User is not authorized to perform: iam:CreateRole
   ```
   → IAMユーザーに必要な権限を追加

## 📖 詳細ドキュメント

- [完全なセットアップガイド](SETUP_GUIDE.md)
- [GitHub Actions設定](GITHUB_ACTIONS.md)
- [トラブルシューティング](TROUBLESHOOTING.md)

## 💬 サポート

問題が解決しない場合は、以下をお試しください：

1. [トラブルシューティングガイド](TROUBLESHOOTING.md)を確認
2. GitHubのIssuesで既知の問題を検索
3. 新しいIssueを作成して質問