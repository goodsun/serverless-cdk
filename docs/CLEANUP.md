# クリーンアップガイド

## スタックの削除

### 基本的な削除コマンド

```bash
# 開発環境の削除
npm run destroy:dev

# ステージング環境の削除
npm run destroy:stg

# 本番環境の削除（リソースは保持される）
npm run destroy:prod
```

## 残留リソースの手動削除

CDKのRemovalPolicyにより、一部のリソースは`destroy`後も残ることがあります。

### CloudWatch LogGroups

LogGroupsが残っている場合の削除方法：

```bash
# 特定のLogGroupを削除
aws logs delete-log-group --log-group-name /aws/lambda/my-app-dev-api

# パターンマッチで一括削除（注意！）
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/my-app-dev" \
  --query 'logGroups[].logGroupName' --output text | \
  xargs -I {} aws logs delete-log-group --log-group-name {}
```

### S3バケット

本番環境のS3バケットは保護されています：

```bash
# バケットの中身を確認
aws s3 ls s3://my-app-prod-storage

# バケットを空にする（危険！）
aws s3 rm s3://my-app-prod-storage --recursive

# バケットを削除
aws s3 rb s3://my-app-prod-storage
```

### DynamoDBテーブル

本番環境のテーブルは保護されています：

```bash
# テーブルの削除（危険！）
aws dynamodb delete-table --table-name my-app-prod-table
```

## 完全クリーンアップスクリプト

開発環境を完全にクリーンアップする場合：

```bash
#!/bin/bash
APP_NAME="my-app"
ENV="dev"
STACK_NAME="${APP_NAME}-${ENV}"

# 1. CDKスタックを削除
CDK_ENV=$ENV npm run destroy

# 2. CloudWatch LogGroupsを削除
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/${STACK_NAME}" \
  --query 'logGroups[].logGroupName' --output text | \
  xargs -I {} aws logs delete-log-group --log-group-name {} 2>/dev/null || true

# 3. 確認
echo "Cleanup completed. Remaining resources:"
aws cloudformation list-stacks \
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
  --query "StackSummaries[?contains(StackName, '${STACK_NAME}')]"
```

## ベストプラクティス

1. **開発環境**: 自由に削除可能（RemovalPolicy.DESTROY）
2. **ステージング環境**: 慎重に削除（データのバックアップ推奨）
3. **本番環境**: 基本的に削除しない（RemovalPolicy.RETAIN）

## トラブルシューティング

### "Stack cannot be deleted while in UPDATE_IN_PROGRESS state"

```bash
# スタックの状態を確認
aws cloudformation describe-stacks --stack-name my-app-dev

# 必要に応じて手動でスタックを削除
aws cloudformation delete-stack --stack-name my-app-dev
```

### "S3 bucket is not empty"

```bash
# バケットを空にしてから削除
aws s3 rm s3://bucket-name --recursive
aws s3 rb s3://bucket-name
```