# GitHub Actions Secrets 設定ガイド

## 🚀 クイックセットアップ

### 1. 必須のSecrets（AWS認証情報）

| Secret名 | 説明 | 例 |
|---------|------|-----|
| `AWS_ACCESS_KEY_ID_DEV` | 開発環境用AWSアクセスキー | AKIAIOSFODNN7EXAMPLE |
| `AWS_SECRET_ACCESS_KEY_DEV` | 開発環境用AWSシークレットキー | wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY |

### 2. .envから転記が必要なSecrets

以下は`.env`ファイルの値をそのままコピー：

| Secret名 | .envの対応項目 | 必須 |
|---------|---------------|------|
| `APP_NAME` | APP_NAME | ✅ |
| `CDK_ACCOUNT_DEV` | CDK_ACCOUNT_DEV | ✅ |
| `CDK_REGION_DEV` | CDK_REGION_DEV | ✅ |
| `LOG_LEVEL_DEV` | LOG_LEVEL_DEV | ⭕ |
| `ENABLE_PITR_DEV` | ENABLE_PITR_DEV | ⭕ |
| `ENABLE_API_CACHE_DEV` | ENABLE_API_CACHE_DEV | ⭕ |

### 3. 設定方法

1. GitHubリポジトリの **Settings** タブを開く
2. 左メニューの **Secrets and variables** → **Actions** をクリック
3. **New repository secret** ボタンをクリック
4. Name と Secret value を入力して保存

### 4. 複数環境を使用する場合

ステージング・本番環境も使用する場合は追加で設定：

```
AWS_ACCESS_KEY_ID_STG
AWS_SECRET_ACCESS_KEY_STG
CDK_ACCOUNT_STG
CDK_REGION_STG
（その他 _STG サフィックスの変数）

AWS_ACCESS_KEY_ID_PROD
AWS_SECRET_ACCESS_KEY_PROD
CDK_ACCOUNT_PROD
CDK_REGION_PROD
（その他 _PROD サフィックスの変数）
```

## 🔍 設定の確認

設定が完了したら、GitHubリポジトリの Actions タブで設定済みのSecretsが表示されます（値は隠されています）。

## 🚨 注意事項

- Secretsの値は一度設定すると内容を確認できません
- 更新する場合は同じ名前で上書き保存します
- `.env`ファイルは絶対にGitにコミットしないでください