# GitHub Actions設定ガイド

## 概要

このプロジェクトはGitHub Actionsを使用した自動デプロイをサポートしています。
ローカル開発環境と同じ環境変数名を使用するため、設定の一貫性が保たれます。

## ブランチ戦略

- `develop` ブランチ → `dev` 環境へ自動デプロイ
- `main` ブランチ → デフォルトでは`dev`環境（カスタマイズ可能）
- `production` ブランチ → `prod` 環境へ自動デプロイ
- 手動実行時は環境を選択可能

**注意**: ステージング環境への自動デプロイが必要な場合は、ワークフローファイルで`main`ブランチの環境マッピングを変更してください。

## 必須のGitHub Secrets設定

### 1. AWS認証情報（環境別）

#### パターンA: 環境別の認証情報（推奨）
```
AWS_ACCESS_KEY_ID_DEV        # 開発環境用 AWS アクセスキー
AWS_SECRET_ACCESS_KEY_DEV    # 開発環境用 AWS シークレットキー

AWS_ACCESS_KEY_ID_STG        # ステージング環境用 AWS アクセスキー
AWS_SECRET_ACCESS_KEY_STG    # ステージング環境用 AWS シークレットキー

AWS_ACCESS_KEY_ID_PROD       # 本番環境用 AWS アクセスキー
AWS_SECRET_ACCESS_KEY_PROD   # 本番環境用 AWS シークレットキー
```

#### パターンB: 単一アカウントの場合
同じAWSアカウントで全環境を管理する場合は、以下のように同じ値を設定：
```
AWS_ACCESS_KEY_ID_DEV = AWS_ACCESS_KEY_ID_STG = AWS_ACCESS_KEY_ID_PROD
AWS_SECRET_ACCESS_KEY_DEV = AWS_SECRET_ACCESS_KEY_STG = AWS_SECRET_ACCESS_KEY_PROD
```

> **重要**: これらの認証情報は絶対に.envファイルに記載しないでください。

### 2. 環境別の設定

#### AWS設定
```
CDK_ACCOUNT_DEV          # 開発環境のAWSアカウントID
CDK_ACCOUNT_STG          # ステージング環境のAWSアカウントID
CDK_ACCOUNT_PROD         # 本番環境のAWSアカウントID

CDK_REGION_DEV           # 開発環境のリージョン（例: ap-northeast-1）
CDK_REGION_STG           # ステージング環境のリージョン
CDK_REGION_PROD          # 本番環境のリージョン
```

#### アプリケーション設定
```
APP_NAME                 # アプリケーション名

LOG_LEVEL_DEV           # 開発環境のログレベル（debug）
LOG_LEVEL_STG           # ステージング環境のログレベル（info）
LOG_LEVEL_PROD          # 本番環境のログレベル（warn）
```

#### 機能フラグ
```
ENABLE_PITR_DEV         # DynamoDB Point-in-Time Recovery（false）
ENABLE_PITR_STG         # DynamoDB Point-in-Time Recovery（false）
ENABLE_PITR_PROD        # DynamoDB Point-in-Time Recovery（true）

ENABLE_API_CACHE_DEV    # API Gatewayキャッシュ（false）
ENABLE_API_CACHE_STG    # API Gatewayキャッシュ（true）
ENABLE_API_CACHE_PROD   # API Gatewayキャッシュ（true）
```

### 3. オプション設定

#### ドメイン設定
```
DOMAIN_NAME             # ドメイン名（例: example.com）

API_SUBDOMAIN_DEV       # 開発環境のサブドメイン（例: api-dev）
API_SUBDOMAIN_STG       # ステージング環境のサブドメイン（例: api-stg）
API_SUBDOMAIN_PROD      # 本番環境のサブドメイン（例: api）

USE_SHARED_CERTIFICATE  # 共有ACM証明書の使用（true/false）

# または個別の証明書ARN
API_CERTIFICATE_ARN_DEV
API_CERTIFICATE_ARN_STG
API_CERTIFICATE_ARN_PROD
```

#### セキュリティ設定
```
ENCRYPTION_KEY_DEV      # 暗号化キー（開発環境）
ENCRYPTION_KEY_STG      # 暗号化キー（ステージング環境）
ENCRYPTION_KEY_PROD     # 暗号化キー（本番環境）
```

#### 外部サービス
```
SLACK_WEBHOOK_URL_DEV   # Slack通知用Webhook（開発環境）
SLACK_WEBHOOK_URL_STG   # Slack通知用Webhook（ステージング環境）
SLACK_WEBHOOK_URL_PROD  # Slack通知用Webhook（本番環境）
```

## GitHub Secretsの設定方法

1. GitHubリポジトリの「Settings」タブを開く
2. 左側メニューから「Secrets and variables」→「Actions」を選択
3. 「New repository secret」をクリック
4. NameとValueを入力して保存

## ローカル環境との統一

ローカル開発環境の`.env`ファイルとGitHub Secretsは同じ変数名を使用します。

**例**: 開発環境のAWSアカウントIDの設定
- ローカル: `.env`ファイルに`CDK_ACCOUNT_DEV=123456789012`
- GitHub: SecretsにName=`CDK_ACCOUNT_DEV`, Value=`123456789012`

`scripts/set-env.sh`が環境（CDK_ENV）に基づいて適切な変数を自動的に選択します。

## デプロイの確認

デプロイが成功すると、GitHub ActionsのSummaryに以下の情報が表示されます：

- デプロイ環境
- API URL
- ブランチ名
- コミットハッシュ

## エラー通知

デプロイが失敗した場合、設定されていればSlackに通知が送信されます。

## トラブルシューティング

### デプロイが失敗する場合

1. **AWS認証情報の確認**
   - `AWS_ACCESS_KEY_ID`と`AWS_SECRET_ACCESS_KEY`が正しく設定されているか確認

2. **必須変数の確認**
   - `CDK_ACCOUNT_*`と`CDK_REGION_*`が環境ごとに設定されているか確認

3. **権限の確認**
   - 使用しているIAMユーザー/ロールに必要な権限があるか確認

### ローカルとGitHub Actionsで動作が異なる場合

1. 環境変数名が一致しているか確認
2. `scripts/set-env.sh`が両環境で正しく実行されているか確認
3. GitHub Secretsに設定漏れがないか確認

## ベストプラクティス

1. **セキュリティ**
   - AWS認証情報は必ずGitHub Secretsで管理
   - 暗号化キーは環境ごとに異なる値を使用

2. **環境の分離**
   - 本番環境は別のAWSアカウントを使用することを推奨
   - 環境ごとに異なるリージョンを使用することも可能

3. **監視とアラート**
   - Slack通知を設定してデプロイ失敗を即座に把握
   - CloudWatchでアプリケーションログを監視