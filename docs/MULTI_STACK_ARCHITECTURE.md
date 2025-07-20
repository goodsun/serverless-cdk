# マルチスタックアーキテクチャガイド

## 概要

複数のマイクロサービスを同一AWS環境に展開する際の、推奨アーキテクチャとACM証明書管理方法を説明します。

## 推奨構成

### スタック構成

```
aws-infrastructure/
├── stacks/
│   ├── acm-stack/          # 証明書管理（共通）
│   ├── network-stack/      # VPC等（必要に応じて）
│   └── shared-stack/       # 共通リソース
│
service-a/                  # マイクロサービスA
├── lib/
│   └── service-a-stack.ts
│
service-b/                  # マイクロサービスB
├── lib/
│   └── service-b-stack.ts
```

## ACM専用スタックの実装

ACM証明書管理は別プロジェクトとして実装することを推奨します。

### 推奨構成

```
your-infrastructure/     # インフラ管理用リポジトリ
├── acm-cdk/            # ACM証明書管理
├── network-stack/      # VPC等（必要に応じて）
└── shared-resources/   # その他共有リソース

your-services/          # サービス用リポジトリ
├── service-a/          # serverless-cdk使用
├── service-b/          # serverless-cdk使用
└── service-c/          # serverless-cdk使用
```

詳細な実装については、別途ACM証明書管理プロジェクトを参照してください。
```

### 2. 各マイクロサービスでの利用

```typescript
// service-a/lib/service-a-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
// import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'; // 静的コンテンツ配信が必要な場合

export class ServiceAStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // SSMから証明書ARNを取得
    const certificateArn = ssm.StringParameter.valueForStringParameter(
      this, '/acm/regional-certificate-arn'
    );
    
    // CloudFront用証明書（静的コンテンツ配信が必要な場合のみ）
    // const cloudfrontCertificateArn = ssm.StringParameter.valueForStringParameter(
    //   this, '/acm/cloudfront-certificate-arn'
    // );

    // または、クロススタック参照
    const importedCertificateArn = cdk.Fn.importValue('SharedCertificateArn');

    // API Gatewayカスタムドメイン
    const certificate = acm.Certificate.fromCertificateArn(
      this, 'Certificate', certificateArn
    );

    const api = new apigateway.RestApi(this, 'ServiceAApi', {
      // API設定
    });

    const domainName = new apigateway.DomainName(this, 'ApiDomain', {
      domainName: `service-a.${process.env.DOMAIN_NAME}`,
      certificate: certificate,
    });

    new apigateway.BasePathMapping(this, 'ApiMapping', {
      domainName,
      restApi: api,
    });

    // CloudFrontディストリビューション（静的コンテンツ配信が必要な場合のみ）
    // この例は参考として残していますが、serverless-cdkプロジェクトには含まれていません
    /*
    const cfCertificate = acm.Certificate.fromCertificateArn(
      this, 'CloudFrontCert', cloudfrontCertificateArn
    );

    const distribution = new cloudfront.CloudFrontWebDistribution(this, 'Distribution', {
      viewerCertificate: cloudfront.ViewerCertificate.fromAcmCertificate(
        cfCertificate,
        {
          aliases: [`app-a.${process.env.DOMAIN_NAME}`],
          securityPolicy: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
        }
      ),
      // その他の設定
    });
    */
  }
}
```

## デプロイ順序

```bash
# 1. 最初にACMスタックをデプロイ
cd aws-infrastructure/stacks/acm-stack
cdk deploy

# 2. DNS検証を完了（マニュアル作業）

# 3. 各サービスをデプロイ
cd ../../../service-a
cdk deploy

cd ../service-b
cdk deploy
```

## 利点

### 1. 証明書の一元管理
- 更新・管理が1箇所
- DNS検証は1回のみ
- 証明書の有効期限管理が簡単

### 2. コスト効率
- 証明書の重複作成を防ぐ
- ACMのAPI呼び出し数を削減

### 3. スケーラビリティ
```
*.yourdomain.com 証明書1つで：
  - service-a.yourdomain.com
  - service-b.yourdomain.com
  - service-c.yourdomain.com
  - feature-x.yourdomain.com
  ...無限に追加可能
```

### 4. 環境分離
```
*.dev.yourdomain.com    → 開発環境
*.stg.yourdomain.com    → ステージング
*.yourdomain.com        → 本番環境
```

## ベストプラクティス

### 1. 証明書の命名規則
```typescript
const certificatePrefix = `${environment}-${region}`;
const certificateName = `${certificatePrefix}-wildcard-certificate`;
```

### 2. タグ付け
```typescript
cdk.Tags.of(certificate).add('Purpose', 'shared-wildcard');
cdk.Tags.of(certificate).add('ManagedBy', 'acm-stack');
cdk.Tags.of(certificate).add('Environment', environment);
```

### 3. 削除保護
```typescript
const certificate = new acm.Certificate(this, 'Certificate', {
  // ...
});

// 証明書の削除を防ぐ
certificate.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);
```

## 代替案：各スタックで管理する場合

もし各スタックで個別に管理する場合のデメリット：

1. **管理の複雑化**
   - 各サービスで証明書更新が必要
   - DNS検証を複数回実行

2. **制限への到達**
   - ACM証明書数の上限（1000個/リージョン）
   - Rate Limitに注意

3. **一貫性の欠如**
   - 証明書設定がバラバラ
   - 有効期限管理が困難

## 推奨アーキテクチャまとめ

```
┌─────────────────────────────────────┐
│          ACM Stack (共通)           │
│  *.yourdomain.com 証明書 (1つ)     │
└──────────────┬──────────────────────┘
               │
    ┌──────────┴──────────┬──────────────┐
    ▼                     ▼              ▼
┌─────────┐         ┌─────────┐    ┌─────────┐
│Service A│         │Service B│    │Service C│
│ Stack   │         │ Stack   │    │ Stack   │
└─────────┘         └─────────┘    └─────────┘
```

この構成により、証明書管理の簡素化とコスト削減を実現できます。