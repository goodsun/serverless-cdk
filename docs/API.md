# API リファレンス

## 概要

serverless-cdkは、RESTful APIを提供します。すべてのエンドポイントはJSON形式でデータを送受信します。

## ベースURL

```
https://your-api-gateway-url/api
```

## 認証

現在のテンプレートでは認証は実装されていません。必要に応じて以下の方式を追加できます：

- JWT認証
- API Key認証
- AWS IAM認証
- Cognito認証

## エンドポイント

### ヘルスチェック

#### `GET /health`

APIの稼働状態を確認します。

**リクエスト**
```bash
curl https://your-api-url/health
```

**レスポンス**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T12:34:56.789Z",
  "environment": "dev",
  "appName": "my-serverless-app"
}
```

### アイテム管理

#### `GET /items`

すべてのアイテムを取得します。

**パラメータ**

| 名前 | 型 | 必須 | 説明 |
|------|-----|------|------|
| type | string | いいえ | アイテムタイプでフィルタリング |

**リクエスト**
```bash
# すべてのアイテムを取得
curl https://your-api-url/items

# タイプでフィルタリング
curl https://your-api-url/items?type=product
```

**レスポンス**
```json
{
  "items": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "サンプルアイテム",
      "description": "これはサンプルアイテムです",
      "type": "product",
      "metadata": {
        "category": "electronics"
      },
      "createdAt": "2024-01-20T10:00:00.000Z",
      "updatedAt": "2024-01-20T10:00:00.000Z"
    }
  ]
}
```

#### `GET /items/{id}`

特定のアイテムを取得します。

**パラメータ**

| 名前 | 型 | 必須 | 説明 |
|------|-----|------|------|
| id | string | はい | アイテムID |

**リクエスト**
```bash
curl https://your-api-url/items/123e4567-e89b-12d3-a456-426614174000
```

**レスポンス（成功）**
```json
{
  "item": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "サンプルアイテム",
    "description": "これはサンプルアイテムです",
    "type": "product",
    "metadata": {
      "category": "electronics"
    },
    "createdAt": "2024-01-20T10:00:00.000Z",
    "updatedAt": "2024-01-20T10:00:00.000Z"
  }
}
```

**レスポンス（エラー）**
```json
{
  "error": "Item not found"
}
```

#### `POST /items`

新しいアイテムを作成します。

**リクエストボディ**

| 名前 | 型 | 必須 | 説明 |
|------|-----|------|------|
| name | string | はい | アイテム名 |
| description | string | いいえ | アイテムの説明 |
| type | string | いいえ | アイテムタイプ（デフォルト: "item"） |
| metadata | object | いいえ | 追加のメタデータ |

**リクエスト**
```bash
curl -X POST https://your-api-url/items \
  -H "Content-Type: application/json" \
  -d '{
    "name": "新しいアイテム",
    "description": "これは新しいアイテムです",
    "type": "product",
    "metadata": {
      "category": "electronics",
      "price": 1000
    }
  }'
```

**レスポンス（成功）**
```json
{
  "item": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "新しいアイテム",
    "description": "これは新しいアイテムです",
    "type": "product",
    "metadata": {
      "category": "electronics",
      "price": 1000
    },
    "createdAt": "2024-01-20T10:00:00.000Z",
    "updatedAt": "2024-01-20T10:00:00.000Z"
  }
}
```

**レスポンス（エラー）**
```json
{
  "error": "Name is required"
}
```

#### `PUT /items/{id}`

既存のアイテムを更新します。

**パラメータ**

| 名前 | 型 | 必須 | 説明 |
|------|-----|------|------|
| id | string | はい | アイテムID |

**リクエストボディ**

| 名前 | 型 | 必須 | 説明 |
|------|-----|------|------|
| name | string | いいえ | 新しいアイテム名 |
| description | string | いいえ | 新しい説明 |
| metadata | object | いいえ | 新しいメタデータ |

**リクエスト**
```bash
curl -X PUT https://your-api-url/items/123e4567-e89b-12d3-a456-426614174000 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "更新されたアイテム",
    "metadata": {
      "category": "electronics",
      "price": 1500,
      "discount": true
    }
  }'
```

**レスポンス（成功）**
```json
{
  "item": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "更新されたアイテム",
    "description": "これは新しいアイテムです",
    "type": "product",
    "metadata": {
      "category": "electronics",
      "price": 1500,
      "discount": true
    },
    "createdAt": "2024-01-20T10:00:00.000Z",
    "updatedAt": "2024-01-20T12:00:00.000Z"
  }
}
```

#### `DELETE /items/{id}`

アイテムを削除します。

**パラメータ**

| 名前 | 型 | 必須 | 説明 |
|------|-----|------|------|
| id | string | はい | アイテムID |

**リクエスト**
```bash
curl -X DELETE https://your-api-url/items/123e4567-e89b-12d3-a456-426614174000
```

**レスポンス（成功）**
```
HTTP/1.1 204 No Content
```

**レスポンス（エラー）**
```json
{
  "error": "Item not found"
}
```

## エラーレスポンス

すべてのエラーレスポンスは以下の形式で返されます：

```json
{
  "error": {
    "message": "エラーメッセージ",
    "stack": "スタックトレース（開発環境のみ）"
  }
}
```

### HTTPステータスコード

| コード | 説明 |
|--------|------|
| 200 | 成功 |
| 201 | 作成成功 |
| 204 | 成功（レスポンスボディなし） |
| 400 | リクエストエラー |
| 404 | リソースが見つからない |
| 500 | サーバーエラー |

## データモデル

### Item

```typescript
interface Item {
  id: string;           // UUID v4
  name: string;         // アイテム名
  description?: string; // 説明（オプション）
  type: string;        // アイテムタイプ
  metadata: object;    // 追加のメタデータ
  createdAt: string;   // ISO 8601形式
  updatedAt: string;   // ISO 8601形式
}
```

## 使用例

### JavaScript/TypeScript

```typescript
// アイテムの作成
const createItem = async (item: Partial<Item>) => {
  const response = await fetch('https://your-api-url/items', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(item),
  });
  
  if (!response.ok) {
    throw new Error('Failed to create item');
  }
  
  return response.json();
};

// 使用例
const newItem = await createItem({
  name: '新しいアイテム',
  type: 'product',
  metadata: { price: 1000 }
});
```

### Python

```python
import requests

# アイテムの取得
def get_items(item_type=None):
    url = 'https://your-api-url/items'
    params = {'type': item_type} if item_type else {}
    
    response = requests.get(url, params=params)
    response.raise_for_status()
    
    return response.json()

# 使用例
items = get_items('product')
print(items)
```

### cURL

```bash
# アイテムの一覧取得
curl -X GET https://your-api-url/items

# アイテムの作成
curl -X POST https://your-api-url/items \
  -H "Content-Type: application/json" \
  -d '{"name":"テストアイテム","type":"test"}'

# アイテムの更新
curl -X PUT https://your-api-url/items/item-id \
  -H "Content-Type: application/json" \
  -d '{"name":"更新されたアイテム"}'

# アイテムの削除
curl -X DELETE https://your-api-url/items/item-id
```

## レート制限

現在のテンプレートではレート制限は設定されていません。本番環境では以下の実装を推奨します：

- API Gateway使用量プランの設定
- Lambda予約同時実行数の設定
- DynamoDB読み書きキャパシティの調整

## CORS設定

すべてのオリジンからのアクセスを許可しています。本番環境では特定のドメインのみを許可するよう設定してください：

```typescript
defaultCorsPreflightOptions: {
  allowOrigins: ['https://your-domain.com'],
  allowMethods: apigateway.Cors.ALL_METHODS,
  allowHeaders: ['Content-Type', 'Authorization'],
  allowCredentials: true,
}
```