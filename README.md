# serverless-cdk

本番環境で実証済みのshareNOTEプロジェクトから抽出した、AWS CDKベースのサーバーレスボイラープレート。

## 🚀 クイックスタート

```bash
# プロジェクト作成
npx create-serverless-cdk@latest my-app
cd my-app

# 環境変数の設定（.envファイルを編集してCDK_DEFAULT_ACCOUNTを設定）
cp .env.example .env

# 初期セットアップとデプロイ
npm install
npm run build
npm run build:api
npm run bootstrap  # 初回のみ
npm run deploy:dev
```

詳細な手順は[セットアップガイド](docs/SETUP_GUIDE.md)を参照してください。

## 📋 機能

- **AWS CDK v2** - TypeScriptによるInfrastructure as Code
- **DynamoDB** - GSI付きシングルテーブル設計
- **Lambda** - Node.js 20.x ランタイム（Express.js統合）
- **API Gateway** - CORS対応REST API
- **S3** - 静的Webサイトホスティング＆ファイルストレージ
- **環境変数管理** - スキーマバリデーション付き.envファイル
- **マルチ環境対応** - dev/stg/prodデプロイメント
- **TypeScript** - 完全な型安全性
- **CRUD API** - すぐに使えるRESTエンドポイント

## 🏗️ アーキテクチャ

このテンプレートは**動的API**に特化したサーバーレスアーキテクチャを提供します。

### 基本構成

#### パターン1: API Gateway直接アクセス

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

**適している場合**：
- リアルタイムデータ（ユーザー固有の情報）
- 頻繁に更新されるデータ
- 認証が必要なAPI
- 転送量が少ない〜中程度

#### パターン2: EC2リバースプロキシ経由

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Client    │────▶│ EC2 (Nginx)  │────▶│ API Gateway  │
└─────────────┘     │ + Let's      │     └──────────────┘
                    │   Encrypt    │              │
                    └──────────────┘              ▼
                                          ┌──────────────┐
                                          │   Lambda     │
                                          └──────────────┘
```

**適している場合**：
- 転送量が多い（月1TB以上）
- レート制限やカスタムルーティングが必要
- 既存のインフラとの統合

### 静的コンテンツについて

静的コンテンツ（フロントエンド）の配信は、このテンプレートのスコープ外です。
S3バケットは作成されますが、CDN配信が必要な場合は各プロジェクトで別途実装してください。

詳細は[アーキテクチャパターンガイド](docs/ARCHITECTURE_PATTERNS.md)を参照

## 📁 プロジェクト構造

```
my-app/
├── bin/              # CDKアプリのエントリーポイント
├── lib/              # CDKスタック定義
├── src/              # ソースコード
│   └── api/         # API Lambdaハンドラー
│       ├── routes/  # Expressルート
│       ├── services/# ビジネスロジック
│       └── middleware/
├── scripts/          # ビルド・デプロイスクリプト
├── public/           # フロントエンド静的ファイル（オプション）
├── cdk.json         # CDK設定
├── package.json     # 依存関係
├── tsconfig.json    # TypeScript設定
└── .env.example     # 環境変数テンプレート
```

## 🛠️ 利用可能なスクリプト

- `npm run build` - TypeScriptコードのビルド
- `npm run build:api` - API Lambda関数のビルド
- `npm run build:frontend` - フロントエンドアセットのビルド
- `npm run deploy:dev` - 開発環境へデプロイ
- `npm run deploy:stg` - ステージング環境へデプロイ
- `npm run deploy:prod` - 本番環境へデプロイ
- `npm run destroy` - CDKスタックの削除
- `npm run synth` - CloudFormationテンプレートの生成

## 🔧 設定

環境変数の設定については[共通コマンド集](docs/COMMON_COMMANDS.md#環境変数設定)を参照してください。

### マルチ環境デプロイメント

各環境へのデプロイコマンドは[共通コマンド集](docs/COMMON_COMMANDS.md#デプロイコマンド)を参照してください。

## 📚 API ドキュメント

デプロイ後、以下のAPIエンドポイントが利用可能：

- `GET /health` - ヘルスチェック
- `GET /items` - 全アイテムの取得
- `GET /items/{id}` - 単一アイテムの取得
- `POST /items` - 新規アイテムの作成
- `PUT /items/{id}` - アイテムの更新
- `DELETE /items/{id}` - アイテムの削除

### リクエスト例

```bash
# アイテムの作成
curl -X POST https://your-api-url/items \
  -H "Content-Type: application/json" \
  -d '{"name": "テストアイテム", "description": "これはテストです"}'

# 全アイテムの取得
curl https://your-api-url/items
```

## 🔒 セキュリティ

- 全DynamoDBテーブルは保存時暗号化
- Lambda関数は最小権限のIAMロールを使用
- S3バケットは本番環境でバージョニング有効
- API GatewayはCORS設定可能

## 🚀 本番環境チェックリスト

- [ ] `.env`の環境変数を更新
- [ ] ACM証明書を取得・検証
- [ ] CloudWatchアラームを設定
- [ ] API Gateway用にAWS WAFを有効化
- [ ] DynamoDBのバックアップ戦略を設定
- [ ] CI/CDパイプラインを構築
- [ ] Lambdaのメモリ/タイムアウトを調整
- [ ] デバッグ用にX-Rayトレーシングを有効化

## 🏢 マルチスタック構成

複数のマイクロサービスを展開する場合の推奨構成については[マルチスタックアーキテクチャガイド](docs/MULTI_STACK_ARCHITECTURE.md)を参照してください。

## 📝 ライセンス

MIT

## 🤝 コントリビューション

プルリクエストは歓迎します！お気軽にご提出ください。

## 🙏 謝辞

このボイラープレートは[shareNOTE](https://github.com/goodsun/sharenote)プロジェクトのアーキテクチャとベストプラクティスに基づいています。## 📚 ドキュメント

### 🚀 はじめに
- [クイックスタートチェックリスト](docs/QUICK_START_CHECKLIST.md) - 事前準備の確認
- [セットアップガイド](docs/SETUP_GUIDE.md) - 詳細な初期設定手順
- [ハンズオンワークショップ](docs/WORKSHOP.md) - 実践的なチュートリアル

### 📖 開発ガイド
- [アーキテクチャ詳細](docs/ARCHITECTURE.md)
- [デプロイメントガイド](docs/DEPLOYMENT.md)
- [GitHub Actions設定](docs/GITHUB_ACTIONS.md)
- [カスタムドメイン設定](docs/CUSTOM_DOMAIN.md)

### 🏗️ アーキテクチャ
- [アーキテクチャパターン](docs/ARCHITECTURE_PATTERNS.md)
- [マルチスタックアーキテクチャ](docs/MULTI_STACK_ARCHITECTURE.md)
- [SSL証明書管理](docs/SSL_CERTIFICATE.md)

### 🆘 サポート
- [トラブルシューティング](docs/TROUBLESHOOTING.md)
- [コントリビューション](CONTRIBUTING.md)
