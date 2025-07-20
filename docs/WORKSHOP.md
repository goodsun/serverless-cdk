# serverless-cdk ハンズオンワークショップ

このワークショップでは、実際にサーバーレスAPIを構築しながら、`serverless-cdk`の使い方を学びます。

## 🎯 ゴール

このワークショップを完了すると、以下ができるようになります：

1. サーバーレスAPIの作成とデプロイ
2. 環境別の設定管理
3. GitHub Actionsによる自動デプロイ
4. 本番環境へのリリース

## ⏱️ 所要時間

- 基本編: 約60分
- 応用編: 約30分

## 📚 目次

1. [事前準備](#事前準備)
2. [基本編: TODO APIの構築](#基本編-todo-apiの構築)
3. [応用編: CI/CDパイプライン](#応用編-cicdパイプライン)
4. [まとめ](#まとめ)

---

## 事前準備

### 必要なもの

- [ ] AWSアカウント（無料枠でOK）
- [ ] GitHubアカウント
- [ ] Node.js v18以上
- [ ] 基本的なコマンドライン操作の知識

### 環境セットアップ（15分）

```bash
# 1. AWS CLIのインストールと設定
aws configure
# Access Key IDとSecret Access Keyを入力

# 2. 必要なツールのインストール
npm install -g aws-cdk
npm install -g create-serverless-cdk

# 3. 動作確認
aws sts get-caller-identity
cdk --version
```

---

## 基本編: TODO APIの構築

### ステップ1: プロジェクトの作成（5分）

```bash
# プロジェクトを作成
create-serverless-cdk todo-api
cd todo-api

# ファイル構造を確認
ls -la
```

**確認ポイント**: 
- `src/api/`フォルダにAPIコードがある
- `lib/`フォルダにインフラ定義がある
- `.env.example`が存在する

### ステップ2: 環境設定（10分）

```bash
# 1. 環境変数ファイルを作成
cp .env.example .env

# 2. AWSアカウントIDを取得
aws sts get-caller-identity --query Account --output text

# 3. .envファイルを編集
# CDK_ACCOUNT_DEV=上で取得したアカウントID
# APP_NAME=todo-api
```

### ステップ3: 初回デプロイ（15分）

```bash
# 1. 依存関係をインストール
npm install

# 2. TypeScriptをビルド
npm run build

# 3. CDKブートストラップ（初回のみ）
npm run cdk bootstrap

# 4. 開発環境にデプロイ
npm run deploy:dev
```

**デプロイ中に作成されるリソース**:
- DynamoDB テーブル
- Lambda 関数
- API Gateway
- S3 バケット
- IAM ロール

### ステップ4: APIの動作確認（10分）

```bash
# 1. API URLを取得
API_URL=$(aws cloudformation describe-stacks \
  --stack-name todo-api-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text)

echo "API URL: $API_URL"

# 2. ヘルスチェック
curl $API_URL/health

# 3. TODOアイテムを作成
curl -X POST $API_URL/items \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AWS CDKを学ぶ",
    "description": "serverless-cdkワークショップを完了する"
  }'

# 4. TODOリストを取得
curl $API_URL/items
```

### ステップ5: コードのカスタマイズ（15分）

#### 新しいエンドポイントを追加

1. `src/api/routes/todos.ts`を作成：

```typescript
import { Router } from 'express';
import { DynamoDBService } from '../services/dynamodb';

const todosRouter = Router();
const dynamodb = new DynamoDBService();

// TODOの完了状態を更新
todosRouter.patch('/:id/complete', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const params = {
      TableName: process.env.TABLE_NAME!,
      Key: { pk: 'ITEM', sk: `ITEM#${id}` },
      UpdateExpression: 'SET completed = :completed, updatedAt = :now',
      ExpressionAttributeValues: {
        ':completed': true,
        ':now': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    };
    
    const result = await dynamodb.update(params);
    res.json(result.Attributes);
  } catch (error) {
    next(error);
  }
});

export { todosRouter };
```

2. `src/api/app.ts`に追加：

```typescript
import { todosRouter } from './routes/todos';

// 既存のルートの後に追加
app.use('/todos', todosRouter);
```

3. 再デプロイ：

```bash
npm run build:api
npm run deploy:dev
```

---

## 応用編: CI/CDパイプライン

### ステップ1: GitHubリポジトリの作成（5分）

```bash
# 1. Gitリポジトリを初期化
git init
git add .
git commit -m "Initial commit: TODO API"

# 2. GitHubで新規リポジトリを作成（ブラウザで）

# 3. リモートを追加してプッシュ
git remote add origin https://github.com/YOUR_USERNAME/todo-api.git
git push -u origin main
```

### ステップ2: GitHub Secretsの設定（10分）

GitHubリポジトリの Settings > Secrets and variables > Actions で以下を追加：

```
AWS_ACCESS_KEY_ID: [あなたのアクセスキー]
AWS_SECRET_ACCESS_KEY: [あなたのシークレットキー]
CDK_ACCOUNT_DEV: [アカウントID]
CDK_ACCOUNT_PROD: [アカウントID]
CDK_REGION_DEV: ap-northeast-1
CDK_REGION_PROD: ap-northeast-1
APP_NAME: todo-api
```

### ステップ3: 自動デプロイの設定（10分）

```bash
# 1. 開発ブランチを作成
git checkout -b develop

# 2. READMEを更新してプッシュ
echo "## TODO API" > README.md
echo "This is a serverless TODO API built with CDK" >> README.md
git add README.md
git commit -m "Update README"
git push -u origin develop
```

GitHub Actionsタブで自動デプロイが開始されることを確認

### ステップ4: 本番デプロイ（5分）

```bash
# 1. 本番ブランチを作成
git checkout main
git checkout -b production

# 2. developの変更をマージ
git merge develop

# 3. 本番環境へデプロイ
git push -u origin production
```

---

## まとめ

### 🎉 完成したもの

1. **TODO API**
   - ヘルスチェックエンドポイント
   - CRUD操作（作成・読取・更新・削除）
   - カスタムエンドポイント（完了機能）

2. **インフラストラクチャ**
   - DynamoDBテーブル（自動スケーリング）
   - Lambda関数（Node.js 20）
   - API Gateway（CORS対応）

3. **CI/CDパイプライン**
   - developブランチ → 開発環境
   - productionブランチ → 本番環境
   - 自動デプロイ

### 📝 学んだこと

- AWS CDKを使ったインフラのコード化
- 環境別の設定管理
- GitHub Actionsによる自動化
- サーバーレスアーキテクチャの基礎

### 🚀 次のステップ

1. **機能追加**
   - 認証機能の実装
   - ファイルアップロード
   - WebSocketによるリアルタイム通信

2. **運用改善**
   - CloudWatchアラームの設定
   - X-Rayによる分散トレーシング
   - コスト最適化

3. **アーキテクチャ拡張**
   - マイクロサービス化
   - イベント駆動アーキテクチャ
   - Step Functionsによるワークフロー

### 🧹 リソースのクリーンアップ

ワークショップ終了後、リソースを削除：

```bash
# 開発環境の削除
CDK_ENV=dev npm run destroy

# 本番環境の削除
CDK_ENV=prod npm run destroy
```

## 📚 参考資料

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [serverless-cdk GitHub](https://github.com/goodsun/serverless-cdk)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)

## ❓ FAQ

**Q: デプロイが失敗する**
A: `aws sts get-caller-identity`でAWS認証を確認してください

**Q: APIが404を返す**
A: API URLが正しいか、`/`プレフィックスが付いているか確認

**Q: コストが心配**
A: 無料枠内で収まる規模です。心配な場合は使用後に`destroy`を実行

---

お疲れ様でした！ 🎊