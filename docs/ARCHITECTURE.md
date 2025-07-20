# アーキテクチャガイド

## 概要

serverless-cdkは、AWS CDKを使用してサーバーレスアプリケーションを構築するためのボイラープレートです。本番環境で実証済みのアーキテクチャパターンを提供します。

## コアコンポーネント

### 1. API Gateway + Lambda

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Client    │────▶│ API Gateway  │────▶│   Lambda     │
└─────────────┘     └──────────────┘     │  (Express)   │
                                          └──────────────┘
```

- **API Gateway**: REST APIのエントリーポイント
- **Lambda**: Express.jsベースのサーバーレス関数
- **統合方法**: AWS Lambda Proxy Integration

### 2. データストレージ

#### DynamoDB（メインデータベース）

シングルテーブル設計を採用：

```typescript
{
  pk: "ITEM#123",           // パーティションキー
  sk: "ITEM#123",          // ソートキー
  gsi1pk: "TYPE#product",  // GSIパーティションキー
  gsi1sk: "CREATED#2024",  // GSIソートキー
  // ... その他の属性
}
```

**メリット**：
- コスト効率が高い
- パフォーマンスの最適化
- トランザクション処理が容易

#### S3（ファイルストレージ）

- 静的アセットの保存
- 大容量ファイルの管理
- バックアップデータの保管

### 3. フロントエンド配信

```
┌─────────────┐     ┌──────────────┐
│   Browser   │────▶│  S3 Bucket   │
└─────────────┘     │  (Website)   │
                    └──────────────┘

注意: CloudFrontは静的コンテンツ配信用のため、このプロジェクトには含まれていません
```

## セキュリティ設計

### IAMロール

最小権限の原則に基づいた設計：

```typescript
// Lambda実行ロール
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:Query",
        "dynamodb:DeleteItem"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/TableName"
    }
  ]
}
```

### 暗号化

- **DynamoDB**: AWS管理の暗号化キー（デフォルト）
- **S3**: サーバーサイド暗号化（SSE-S3）
- **Lambda環境変数**: KMSによる暗号化

## スケーラビリティ

### 自動スケーリング

- **API Gateway**: 自動的にスケール
- **Lambda**: 同時実行数に基づく自動スケール
- **DynamoDB**: オンデマンドモード（自動スケール）

### パフォーマンス最適化

1. **Lambda関数の最適化**
   - コールドスタート対策
   - メモリサイズの調整
   - 接続プーリング

2. **キャッシング戦略**
   - EC2/Nginxリバースプロキシでのキャッシュ
   - API Gatewayレスポンスキャッシュ
   - Lambda内メモリキャッシュ

## 監視とロギング

### CloudWatch統合

```
Lambda ──────▶ CloudWatch Logs
   │
   └─────────▶ CloudWatch Metrics
                    │
                    └──▶ CloudWatch Alarms
```

### 主要メトリクス

- Lambda実行時間
- API Gatewayレイテンシー
- DynamoDBスロットリング
- エラー率

## デプロイメント戦略

### 環境分離

```
開発環境 (dev)
  ├── my-app-dev-table
  ├── my-app-dev-api
  └── my-app-dev-lambda

本番環境 (prod)
  ├── my-app-prod-table
  ├── my-app-prod-api
  └── my-app-prod-lambda
```

### ブルー/グリーンデプロイメント

CDKによる安全なデプロイメント：

1. 新しいリソースの作成
2. トラフィックの切り替え
3. 古いリソースの削除

## コスト最適化

### 推定月額コスト（小規模アプリケーション）

| サービス | 使用量 | 推定コスト |
|---------|-------|-----------|
| API Gateway | 100万リクエスト | $3.50 |
| Lambda | 100万実行 x 256MB | $2.00 |
| DynamoDB | 1GB + 100万読み書き | $1.50 |
| S3 | 10GB | $0.23 |
| **合計** | | **約$7.23** |

### コスト削減のヒント

1. Lambda関数のメモリサイズ最適化
2. DynamoDBオンデマンドモードの活用
3. S3ライフサイクルポリシーの設定
4. 不要なログの削除

## ベストプラクティス

### 1. エラーハンドリング

```typescript
// グローバルエラーハンドラー
app.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).json({
    error: "Internal Server Error"
  });
});
```

### 2. 環境変数管理

```bash
# 本番環境では絶対に含めない
.env
.env.local

# 環境ごとの設定
.env.dev
.env.stg
.env.prod
```

### 3. テスト戦略

- ユニットテスト: ビジネスロジック
- 統合テスト: API エンドポイント
- E2Eテスト: ユーザーフロー

## トラブルシューティング

### よくある問題

1. **Lambda タイムアウト**
   - タイムアウト値の調整
   - 非同期処理の活用

2. **CORS エラー**
   - API Gateway CORS設定の確認
   - プリフライトリクエストの処理

3. **権限エラー**
   - IAMロールの確認
   - リソースポリシーの検証