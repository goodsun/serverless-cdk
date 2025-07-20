# カスタムドメイン設定ガイド

## 概要

既存ドメインのサブドメインやワイルドカードドメインを使用してサーバーレスアプリケーションを公開する方法を説明します。

## 前提条件

1. ドメインを所有していること
2. DNSレコードを編集できること
3. AWS Certificate Manager (ACM) でSSL証明書を取得済みであること

## ACM証明書の取得

### ワイルドカード証明書の作成

```bash
# us-east-1リージョンで作成（CloudFront用 - このプロジェクトでは使用しません）
# aws acm request-certificate \
#   --domain-name "*.yourdomain.com" \
#   --validation-method DNS \
#   --region us-east-1

# API Gateway用（使用するリージョン）
aws acm request-certificate \
  --domain-name "api.yourdomain.com" \
  --validation-method DNS \
  --region ap-northeast-1
```

### DNS検証

ACMコンソールまたはCLIで表示されるCNAMEレコードをDNSに追加して検証を完了させます。

## 実装方法

### API Gatewayカスタムドメイン

```typescript
// lib/serverless-stack.ts に追加
import * as route53 from 'aws-cdk-lib/aws-route53';

const apiDomain = process.env.API_CUSTOM_DOMAIN; // 例: api.yourdomain.com
const apiCertificateArn = process.env.API_CERTIFICATE_ARN;

if (apiDomain && apiCertificateArn) {
  // カスタムドメインの作成
  const domainName = new apigateway.DomainName(this, 'ApiDomainName', {
    domainName: apiDomain,
    certificate: acm.Certificate.fromCertificateArn(
      this, 'ApiCertificate', apiCertificateArn
    ),
  });

  // ベースパスマッピング
  new apigateway.BasePathMapping(this, 'ApiBasePathMapping', {
    domainName,
    restApi: this.api,
  });

  new cdk.CfnOutput(this, 'ApiDomainNameTarget', {
    value: domainName.domainNameAliasDomainName,
    description: 'API Gateway domain name - add this as CNAME record',
  });
}
```

### 環境別サブドメイン対応

```typescript
// 環境ごとのサブドメイン
const environment = process.env.CDK_ENV || 'dev';
const baseDomain = process.env.DOMAIN_NAME; // yourdomain.com

const subdomains = {
  dev: `${appName}-dev.${baseDomain}`,
  stg: `${appName}-stg.${baseDomain}`,
  prod: `${appName}.${baseDomain}`,
};

const customDomain = subdomains[environment];
```

## DNS設定

### 既存のDNSプロバイダーでの設定

#### Cloudflareの場合
```
Type: CNAME
Name: api
Target: xxxxx.execute-api.region.amazonaws.com
Proxy: OFF
```

#### お名前.comの場合
```
ホスト名: api
TYPE: CNAME
VALUE: xxxxx.execute-api.region.amazonaws.com
```

#### VALUE-DOMAINの場合
```
cname api xxxxx.execute-api.region.amazonaws.com.
```

## 環境変数の設定

`.env` ファイルに追加：

```bash
# ドメイン設定
DOMAIN_NAME=yourdomain.com

# ACMスタックの証明書を使用する場合
USE_SHARED_CERTIFICATE=true

# または個別の証明書ARNを指定
# API_CERTIFICATE_ARN=arn:aws:acm:ap-northeast-1:123456789012:certificate/xxxxx
```

## デプロイ手順

1. ACM証明書を作成・検証
2. 環境変数を設定
3. CDKをデプロイ
   ```bash
   npm run deploy:prod
   ```
4. 出力されたCNAMEターゲットをDNSに設定
5. DNS伝播を待つ（最大48時間）

## トラブルシューティング

### 証明書エラー

**問題**: 「Certificate validation failed」

**解決策**:
- ACM証明書が正しいリージョンにあるか確認
- CloudFront用は必ず `us-east-1` リージョン（このプロジェクトでは使用しません）
- 証明書のドメイン名が一致しているか確認

### DNS解決エラー

**問題**: ドメインにアクセスできない

**解決策**:
```bash
# DNS伝播を確認
nslookup app.yourdomain.com
dig app.yourdomain.com

# CNAMEレコードが正しく設定されているか確認
dig app.yourdomain.com CNAME
```

### ワイルドカードドメインの制限

- API Gatewayは具体的なサブドメインのみサポート（ワイルドカード不可）
- 複数のサブドメインが必要な場合は、個別に設定が必要
- CloudFrontは静的コンテンツ配信用のため、このプロジェクトのスコープ外です

## ベストプラクティス

1. **証明書の管理**
   - ワイルドカード証明書（`*.yourdomain.com`）を使用して管理を簡素化
   - 自動更新を設定

2. **環境ごとの分離**
   ```
   dev-api.yourdomain.com  → 開発環境
   stg-api.yourdomain.com  → ステージング環境
   api.yourdomain.com      → 本番環境
   ```

3. **セキュリティ**
   - API GatewayでWAFを有効化
   - 最新のTLSバージョンを使用
   - HSTSヘッダーを設定

## コスト

- **ACM証明書**: 無料
- **API Gatewayカスタムドメイン**: 月額約$0.50/ドメイン
- **API Gateway**: リクエスト数とデータ転送量に基づく従量課金

## まとめ

Route 53を使わなくても、既存のDNSプロバイダーでCNAMEレコードを設定することで、カスタムドメインでサーバーレスアプリケーションを公開できます。このプロジェクトは動的APIに特化しているため、CloudFrontは含まれていません。