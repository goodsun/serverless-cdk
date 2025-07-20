# アーキテクチャパターンガイド

## 概要

サービスの特性に応じて、最適なアーキテクチャパターンを選択するためのガイドです。

> **注意**: このserverless-cdkプロジェクトは動的APIサービスに特化しており、CloudFront（パターン1）は含まれていません。静的コンテンツ配信が必要な場合は、別途CDNソリューションをご検討ください。

## パターン1: フルサーバーレス（CloudFront + ACM）

```
Client → CloudFront → API Gateway → Lambda
             ↓
        ACM証明書（無料）
```

### 適している場合
- 転送量が少ない〜中程度（月100GB以下）
- グローバル配信が必要
- 運用工数を最小化したい
- スケーラビリティを重視

### メリット
- ✅ 完全マネージド（運用不要）
- ✅ 自動スケール
- ✅ グローバルCDN
- ✅ DDoS保護（AWS Shield）
- ✅ 証明書の自動更新

### デメリット
- ❌ 転送量が多いと高額
- ❌ キャッシュ制御が複雑

## パターン2: EC2リバースプロキシ（Nginx + Let's Encrypt）

```
Client → EC2 (Nginx) → API Gateway → Lambda
             ↓
      Let's Encrypt証明書
```

### 適している場合
- 転送量が多い（月1TB以上）
- 固定費で予算管理したい
- Nginxの高度な機能が必要
- 既存のインフラがある

### メリット
- ✅ 転送量が多い場合にコスト効率的
- ✅ Nginxの柔軟な設定
- ✅ リアルタイムログ
- ✅ カスタムヘッダー処理

### デメリット
- ❌ EC2の管理が必要
- ❌ 手動スケーリング
- ❌ 証明書の手動更新（自動化は可能）

## パターン3: ハイブリッド構成

```
静的コンテンツ → CloudFront → S3
                      ↓
                 ACM証明書

APIリクエスト → EC2 (Nginx) → API Gateway → Lambda
                     ↓
              Let's Encrypt証明書
```

### 適している場合
- 静的コンテンツは少ないがAPIリクエストが多い
- コストと性能のバランスを取りたい
- 段階的な移行を計画している

## 実装例

### EC2リバースプロキシの設定

```nginx
# /etc/nginx/sites-available/api-proxy
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    # Let's Encrypt証明書
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # SSL設定
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # セキュリティヘッダー
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # API Gatewayへのプロキシ
    location / {
        proxy_pass https://xxxxx.execute-api.ap-northeast-1.amazonaws.com;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # タイムアウト設定
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # バッファリング
        proxy_buffering off;
    }
    
    # ヘルスチェック
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}

# HTTP→HTTPSリダイレクト
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

### EC2インスタンスのセットアップ

```bash
#!/bin/bash
# setup-nginx-proxy.sh

# システムアップデート
sudo apt-get update
sudo apt-get upgrade -y

# Nginxインストール
sudo apt-get install -y nginx

# Certbotインストール
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# Let's Encrypt証明書取得
sudo certbot --nginx -d api.yourdomain.com -d app.yourdomain.com

# 自動更新設定
echo "0 0,12 * * * root python3 -c 'import random; import time; time.sleep(random.random() * 3600)' && certbot renew -q" | sudo tee -a /etc/crontab > /dev/null

# Nginxサービス起動
sudo systemctl enable nginx
sudo systemctl start nginx
```

## コスト計算ツール

```typescript
// cost-calculator.ts
interface CostEstimate {
  pattern: string;
  monthly: number;
  details: Record<string, number>;
}

function calculateCost(
  transferGB: number,
  requestsMillions: number
): Record<string, CostEstimate> {
  // CloudFront + ACM
  const cloudfrontCost: CostEstimate = {
    pattern: 'CloudFront + ACM',
    monthly: 0,
    details: {
      certificate: 0, // ACMは無料
      dataTransfer: transferGB * 0.085, // $0.085/GB (アジア)
      requests: requestsMillions * 0.0075, // $0.0075/10,000リクエスト
    }
  };
  cloudfrontCost.monthly = Object.values(cloudfrontCost.details).reduce((a, b) => a + b, 0);

  // EC2 + Nginx
  const ec2Cost: CostEstimate = {
    pattern: 'EC2 (t3.nano) + Nginx',
    monthly: 0,
    details: {
      ec2Instance: 3.7, // t3.nano
      eip: 3.6, // Elastic IP
      dataTransfer: Math.max(0, (transferGB - 100) * 0.09), // 100GB無料枠後
      certificate: 0, // Let's Encryptは無料
    }
  };
  ec2Cost.monthly = Object.values(ec2Cost.details).reduce((a, b) => a + b, 0);

  return { cloudfrontCost, ec2Cost };
}

// 使用例
const costs = calculateCost(500, 10); // 500GB転送、1000万リクエスト
console.log(costs);
```

## 選択フローチャート

```
スタート
    │
    ├─ 静的コンテンツか？
    │   │
    │   ├─ YES → CloudFront + S3
    │   │
    │   └─ NO（動的API）
    │       │
    │       ├─ キャッシュ可能か？
    │       │   │
    │       │   ├─ YES（商品カタログ等）→ CloudFront + API Gateway
    │       │   │
    │       │   └─ NO（ユーザー固有データ等）
    │       │       │
    │       │       ├─ 転送量は月1TB以上？
    │       │       │   │
    │       │       │   ├─ YES → EC2 + Nginxを検討
    │       │       │   │         │
    │       │       │   │         └─ 運用工数は許容できる？
    │       │       │   │              │
    │       │       │   │              ├─ YES → EC2 + Nginx
    │       │       │   │              └─ NO  → API Gateway直接
    │       │       │   │
    │       │       │   └─ NO → API Gateway直接
    │       │       │
    │       │       └─ 終了
    │
    └─ 終了
```

## CDN使用の判断基準

### CDNを使うべきケース

1. **静的アセット**
   - HTML、CSS、JavaScript
   - 画像、動画、フォント
   - ダウンロードファイル

2. **キャッシュ可能なAPI**
   ```javascript
   // 例：商品カタログ（1時間キャッシュ）
   response.headers['Cache-Control'] = 'public, max-age=3600';
   ```

3. **読み取り専用のマスターデータ**
   - 都道府県リスト
   - カテゴリ一覧
   - 設定情報

### CDNを避けるべきケース

1. **ユーザー固有のデータ**
   ```javascript
   // ❌ 悪い例：CDN経由でユーザーデータ取得
   GET https://cdn.example.com/api/users/me
   
   // ✅ 良い例：API Gateway直接
   GET https://api.example.com/users/me
   ```

2. **リアルタイム性が求められるデータ**
   - チャット、通知
   - 在庫情報
   - 価格情報

3. **認証が必要なエンドポイント**
   - プライベートAPI
   - 管理画面API

## ベストプラクティス

### 1. 段階的アプローチ
- 開発環境: CloudFront（簡単セットアップ）
- 本番環境: トラフィックを見てから最適化

### 2. 監視とアラート
```bash
# CloudWatch アラーム設定
aws cloudwatch put-metric-alarm \
  --alarm-name "High-Data-Transfer" \
  --alarm-description "Alert when data transfer exceeds threshold" \
  --metric-name BytesDownloaded \
  --namespace AWS/CloudFront \
  --statistic Sum \
  --period 86400 \
  --threshold 1099511627776 \  # 1TB
  --comparison-operator GreaterThanThreshold
```

### 3. コスト最適化
- CloudFront: 適切なキャッシュ設定
- EC2: 適切なインスタンスサイズ選択
- 両方: 圧縮の有効化

## まとめ

| 項目 | CloudFront + ACM | EC2 + Nginx |
|------|------------------|-------------|
| 初期設定 | 簡単 | 複雑 |
| 運用工数 | ほぼゼロ | 定期メンテ必要 |
| スケーラビリティ | 自動 | 手動 |
| 転送量少（<100GB/月） | ◎ コスト効率的 | △ 固定費が高い |
| 転送量多（>1TB/月） | △ 高額になる | ◎ コスト効率的 |
| グローバル配信 | ◎ 世界中のエッジ | △ リージョン限定 |
| カスタマイズ性 | △ 制限あり | ◎ 完全制御可能 |

サービスの成長段階と要件に応じて、適切なパターンを選択することが重要です。