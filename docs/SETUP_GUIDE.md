# セットアップガイド

このガイドでは、`serverless-cdk`を使用してプロジェクトを開始するための完全な手順を説明します。

## 📋 前提条件

### 1. ローカル環境

- **Node.js**: バージョン18以上
- **npm**: バージョン8以上
- **Git**: バージョン2以上

```bash
# バージョン確認
node --version  # v18.0.0以上
npm --version   # 8.0.0以上
git --version   # 2.0.0以上
```

### 2. AWSアカウント

- AWSアカウントを持っていること
- プログラムによるアクセスが可能なIAMユーザー
- 必要な権限（後述）

### 3. GitHubアカウント

- GitHubアカウントを持っていること
- リポジトリ作成権限

## 🔧 初期セットアップ

### ステップ1: AWS CLIのインストールと設定

```bash
# AWS CLIのインストール（macOS）
brew install awscli

# または公式インストーラーを使用
# https://aws.amazon.com/cli/

# AWS認証情報の設定
aws configure
# AWS Access Key ID [None]: YOUR_ACCESS_KEY
# AWS Secret Access Key [None]: YOUR_SECRET_KEY
# Default region name [None]: ap-northeast-1
# Default output format [None]: json

# 設定確認
aws sts get-caller-identity
```

### ステップ2: AWS CDKのインストール

```bash
# グローバルインストール
npm install -g aws-cdk

# バージョン確認
cdk --version
```

### ステップ3: IAMユーザーの権限設定

CDKを使用するために必要な最小権限ポリシー：

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
        "logs:*",
        "ssm:GetParameter",
        "acm:DescribeCertificate",
        "acm:ListCertificates"
      ],
      "Resource": "*"
    }
  ]
}
```

> **注意**: 本番環境では、より制限的な権限を設定することを推奨します。

### ステップ4: serverless-cdkのインストール

```bash
# グローバルインストール
npm install -g create-serverless-cdk

# インストール確認
create-serverless-cdk --version
```

## 🚀 プロジェクト作成

### ステップ1: 新規プロジェクトの作成

```bash
# プロジェクトを作成
create-serverless-cdk my-api

# プロジェクトディレクトリに移動
cd my-api
```

### ステップ2: 環境変数の設定

```bash
# .envファイルを作成
cp .env.example .env

# .envファイルを編集
# 以下の値を実際の値に置き換えてください：
# CDK_ACCOUNT_DEV=123456789012  # あなたのAWSアカウントID
# CDK_ACCOUNT_STG=123456789012  # ステージング用（同じでもOK）
# CDK_ACCOUNT_PROD=123456789012 # 本番用（別推奨）
```

AWSアカウントIDの確認方法：
```bash
aws sts get-caller-identity --query Account --output text
```

### ステップ3: 依存関係のインストール

```bash
npm install
```

### ステップ4: CDKブートストラップ

```bash
# 初回のみ実行が必要
npm run bootstrap

# または特定のアカウント/リージョンを指定
cdk bootstrap aws://123456789012/ap-northeast-1
```

## 🐙 GitHub設定

### ステップ1: GitHubリポジトリの作成

1. GitHubにログイン
2. 右上の「+」→「New repository」をクリック
3. リポジトリ名を入力（例: `my-api`）
4. Privateを選択（推奨）
5. 「Create repository」をクリック

### ステップ2: ローカルリポジトリの初期化

```bash
# Gitリポジトリを初期化
git init

# すべてのファイルを追加
git add .

# 初回コミット
git commit -m "Initial commit from serverless-cdk template"

# リモートリポジトリを追加
git remote add origin https://github.com/YOUR_USERNAME/my-api.git

# mainブランチにプッシュ
git push -u origin main
```

### ステップ3: ブランチ戦略の設定

```bash
# 開発ブランチを作成
git checkout -b develop
git push -u origin develop

# 本番ブランチを作成（オプション）
git checkout main
git checkout -b production
git push -u origin production
```

### ステップ4: GitHub Secretsの設定

#### 必須のSecrets

1. GitHubリポジトリの「Settings」タブを開く
2. 左メニューから「Secrets and variables」→「Actions」を選択
3. 「New repository secret」をクリック
4. 以下のSecretsを追加：

**AWS認証情報（必須）**
```
Name: AWS_ACCESS_KEY_ID
Value: [あなたのAWSアクセスキー]

Name: AWS_SECRET_ACCESS_KEY
Value: [あなたのAWSシークレットキー]
```

**環境別設定（必須）**
```
Name: CDK_ACCOUNT_DEV
Value: 123456789012

Name: CDK_ACCOUNT_STG
Value: 123456789012

Name: CDK_ACCOUNT_PROD
Value: 234567890123

Name: CDK_REGION_DEV
Value: ap-northeast-1

Name: CDK_REGION_STG
Value: ap-northeast-1

Name: CDK_REGION_PROD
Value: ap-northeast-1

Name: APP_NAME
Value: my-api
```

**オプション設定**
```
# Slack通知を使用する場合
Name: SLACK_WEBHOOK_URL_DEV
Value: https://hooks.slack.com/services/xxx
```

### ステップ5: GitHub Actionsの有効化

1. リポジトリの「Actions」タブを開く
2. 「I understand my workflows, go ahead and enable them」をクリック

## ✅ 動作確認

### ローカルデプロイのテスト

```bash
# 開発環境にデプロイ
npm run deploy:dev

# デプロイ結果の確認
aws cloudformation describe-stacks \
  --stack-name my-api-dev \
  --query 'Stacks[0].Outputs'
```

### GitHub Actions経由のデプロイテスト

```bash
# developブランチにプッシュ
git checkout develop
echo "# Test update" >> README.md
git add README.md
git commit -m "Test GitHub Actions deployment"
git push origin develop
```

GitHubの「Actions」タブでワークフローの実行状況を確認できます。

## 🔍 トラブルシューティング

### AWS認証エラー

```
Error: Need to perform AWS calls for account 123456789012, but no credentials have been configured
```

**解決方法**:
```bash
# AWS認証情報を再設定
aws configure

# プロファイルを使用している場合
export AWS_PROFILE=your-profile-name
```

### CDKブートストラップエラー

```
Error: This stack uses assets, so the toolkit stack must be deployed to the environment
```

**解決方法**:
```bash
# ブートストラップを実行
cdk bootstrap aws://ACCOUNT-ID/REGION
```

### GitHub Actionsエラー

Actions実行時のエラーは、GitHubの「Actions」タブで詳細を確認できます。

一般的な原因：
- Secretsの設定漏れ
- 権限不足
- リージョンの不一致

## 📚 次のステップ

1. [デプロイメントガイド](DEPLOYMENT.md) - 詳細なデプロイ手順
2. [GitHub Actions設定](GITHUB_ACTIONS.md) - CI/CDの詳細設定
3. [アーキテクチャガイド](ARCHITECTURE.md) - システム設計の詳細

## 💡 ベストプラクティス

1. **環境の分離**
   - 本番環境は別のAWSアカウントを使用
   - 環境ごとに異なるIAMロールを使用

2. **セキュリティ**
   - AWS認証情報は絶対にコミットしない
   - `.env`ファイルは`.gitignore`に含まれていることを確認

3. **命名規則**
   - プロジェクト名は小文字とハイフンのみ使用
   - 環境名は`dev`, `stg`, `prod`で統一

4. **バージョン管理**
   - セマンティックバージョニングを使用
   - タグを使用してリリースを管理