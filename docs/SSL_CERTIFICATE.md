# SSL証明書設定ガイド

## 概要

サーバーレスアプリケーションでHTTPS通信を実現するための証明書設定方法を説明します。

## 証明書の選択肢

### 1. AWS Certificate Manager (ACM) - 推奨

**メリット**：
- ✅ **完全無料**
- ✅ 自動更新
- ✅ AWSサービスとネイティブ統合
- ✅ 管理不要
- ✅ EC2不要

**デメリット**：
- ❌ AWSサービスでのみ使用可能
- ❌ 証明書のエクスポート不可

### 2. Let's Encrypt

**メリット**：
- ✅ 無料
- ✅ 広く認知された認証局
- ✅ 任意のサーバーで使用可能

**デメリット**：
- ❌ 90日ごとの更新が必要
- ❌ CloudFront/API Gatewayで直接使用不可
- ❌ 通常はEC2が必要

## ACMを使った証明書取得（推奨）

### 1. ワイルドカード証明書の作成

```bash
# CloudFront用（必ずus-east-1）- このプロジェクトでは使用しません
# aws acm request-certificate \
#   --domain-name "*.yourdomain.com" \
#   --subject-alternative-names "yourdomain.com" \
#   --validation-method DNS \
#   --region us-east-1

# API Gateway用（使用するリージョン）
aws acm request-certificate \
  --domain-name "api.yourdomain.com" \
  --validation-method DNS \
  --region ap-northeast-1
```

### 2. DNS検証

```bash
# 検証用のCNAMEレコードを確認
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:region:account:certificate/xxx \
  --region us-east-1
```

DNSプロバイダーに以下のようなレコードを追加：
```
_xxxxx.yourdomain.com. CNAME _yyyyy.acm-validations.aws.
```

### 3. 検証完了の確認

```bash
# ステータスがISSUEDになるまで待つ
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:region:account:certificate/xxx \
  --query 'Certificate.Status'
```

## Let's Encryptを使いたい場合

### 方法1: DNS-01チャレンジ（EC2不要）

```bash
# certbotのインストール
sudo apt-get update
sudo apt-get install certbot

# DNS-01チャレンジで証明書取得
sudo certbot certonly \
  --manual \
  --preferred-challenges dns-01 \
  -d "*.yourdomain.com" \
  -d "yourdomain.com" \
  --email your-email@example.com \
  --agree-tos
```

**注意**: 取得した証明書はCloudFront/API Gatewayで直接使用できません

### 方法2: EC2リバースプロキシ構成

```nginx
# /etc/nginx/sites-available/default
server {
    listen 443 ssl;
    server_name api.yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    location / {
        proxy_pass https://xxxxx.execute-api.region.amazonaws.com;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

自動更新設定：
```bash
# Cronジョブ追加
0 0 * * * /usr/bin/certbot renew --quiet
```

### 方法3: Let's Encrypt証明書をACMにインポート

```bash
# 証明書をACMにインポート（非推奨）
aws acm import-certificate \
  --certificate fileb:///etc/letsencrypt/live/yourdomain.com/cert.pem \
  --certificate-chain fileb:///etc/letsencrypt/live/yourdomain.com/chain.pem \
  --private-key fileb:///etc/letsencrypt/live/yourdomain.com/privkey.pem \
  --region us-east-1
```

**問題点**：
- 90日ごとに再インポートが必要
- 自動化スクリプトが複雑

## CDKでの証明書使用

### 環境変数設定

```bash
# .env
CERTIFICATE_ARN=arn:aws:acm:us-east-1:123456789012:certificate/xxxxx
API_CERTIFICATE_ARN=arn:aws:acm:ap-northeast-1:123456789012:certificate/yyyyy
```

### CDK実装

```typescript
// lib/serverless-stack.ts
const certificateArn = process.env.CERTIFICATE_ARN;

if (certificateArn) {
  const certificate = acm.Certificate.fromCertificateArn(
    this, 'Certificate', certificateArn
  );
  
  // CloudFrontで使用
  const distribution = new cloudfront.CloudFrontWebDistribution(this, 'Distribution', {
    viewerCertificate: cloudfront.ViewerCertificate.fromAcmCertificate(
      certificate,
      {
        aliases: [customDomain],
        securityPolicy: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      }
    ),
    // ...
  });
}
```

## コスト比較

| 方法 | 証明書コスト | インフラコスト | 管理工数 |
|------|-------------|---------------|----------|
| ACM | 無料 | なし | 低（自動更新） |
| Let's Encrypt + EC2 | 無料 | EC2料金（月$5〜） | 高（手動設定） |
| 商用SSL | 年$10〜 | なし | 中（年次更新） |

## 推奨アーキテクチャ

### サーバーレス完結型（推奨）

```
Client → CloudFront → S3/API Gateway → Lambda
           ↓
      ACM証明書（無料・自動更新）
```

### EC2プロキシ型（Let's Encrypt使用時）

```
Client → EC2 (Nginx) → API Gateway → Lambda
           ↓
    Let's Encrypt証明書
```

## まとめ

- **ACMが最も簡単で無料**：EC2不要、自動更新、AWSサービスと完全統合
- **Let's Encryptを使いたい場合**：EC2でリバースプロキシを構築
- **コストを最小化**：ACMを使えばEC2費用も証明書費用も不要

サーバーレスアーキテクチャではACMの使用を強く推奨します。Let's Encryptにこだわる特別な理由がない限り、ACMを使うことで運用負荷とコストを大幅に削減できます。