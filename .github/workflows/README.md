# GitHub Actions ワークフロー

このディレクトリには serverless-cdk プロジェクトの CI/CD ワークフローが含まれています。

## test.yml (自動実行)

テンプレートの動作を検証するワークフローです。

### トリガー
- develop, staging, production ブランチへの push
- 上記ブランチへの Pull Request

### テスト内容
1. **マトリックステスト**
   - Node.js バージョン: 18.x, 20.x
   - フロントエンド構成: 静的HTML, Vite/React

2. **ビルドプロセス検証**
   - TypeScript コンパイル
   - API ビルド
   - フロントエンドビルド（CI環境での依存関係インストール含む）
   - CDK synth

3. **設定ファイル検証**
   - 必要なファイルの存在確認
   - tsconfig.json の exclude 設定
   - .gitignore の設定

### 環境変数
テスト用のデフォルト値が設定されています：
- `APP_NAME`: serverless-cdk-test
- `AWS_REGION`: us-east-1
- `LOG_LEVEL`: info
- `ENABLE_PITR`: false
- `ENABLE_API_CACHE`: false

### 実プロジェクトでの利用
実際のプロジェクトでは、以下の Secrets 設定が必要です：
- `AWS_ACCESS_KEY_ID_DEV`
- `AWS_SECRET_ACCESS_KEY_DEV`
- `CDK_ACCOUNT_DEV`
- `CDK_REGION_DEV`

詳細は [GITHUB_SECRETS_SETUP.md](../../template/GITHUB_SECRETS_SETUP.md) を参照してください。

## deploy-test.yml (手動実行)

実際にAWSへデプロイして動作を検証するワークフローです。

### トリガー
- 手動実行（workflow_dispatch）
- パラメータ：
  - `environment`: デプロイ環境（test/dev）
  - `destroy_after_test`: テスト後にスタックを削除するか

### テスト内容
1. **実際のAWSデプロイ**
   - CDK Bootstrap（必要な場合）
   - スタックのデプロイ

2. **APIエンドポイントテスト**
   - ヘルスチェック
   - CRUD操作（作成・取得・一覧・削除）

3. **フロントエンドテスト**
   - アクセス可能性の確認

4. **CloudWatchログ確認**
   - Lambda関数のログ出力確認

### 必要なSecrets
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_ACCOUNT_ID` または `CDK_ACCOUNT_DEV`
- `AWS_REGION` または `CDK_REGION_DEV`

### 使用方法
1. GitHub Actions タブを開く
2. "Deploy Test" ワークフローを選択
3. "Run workflow" をクリック
4. パラメータを設定して実行

### 注意事項
- 実際のAWSリソースが作成されるため、コストが発生します
- `destroy_after_test` を `true` にすることを推奨
- テスト用のAWSアカウントでの実行を推奨