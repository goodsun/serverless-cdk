# フロントエンド開発ガイド

## 概要

このガイドでは、serverless-cdkで作成したAPIと連携するフロントエンド開発の手順を説明します。

## 🏗️ フロントエンドアーキテクチャ

### 推奨構成1: S3 + CloudFront（静的サイト）

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Browser   │────▶│  CloudFront  │────▶│     S3       │
└─────────────┘     └──────────────┘     └──────────────┘
       │                                         
       └────────────────────┐                    
                           ▼                    
                    ┌──────────────┐            
                    │ API Gateway  │            
                    └──────────────┘            
```

### 推奨構成2: SSRアプリケーション

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Browser   │────▶│   Next.js    │────▶│ API Gateway  │
└─────────────┘     │   (Vercel)   │     └──────────────┘
                    └──────────────┘            
```

## 📁 プロジェクト構造

### React/Vue/Angularアプリケーション
```
frontend/
├── public/             # 静的ファイル
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── components/     # UIコンポーネント
│   ├── pages/         # ページコンポーネント
│   ├── services/      # API通信層
│   ├── hooks/         # カスタムフック
│   ├── utils/         # ユーティリティ関数
│   └── types/         # TypeScript型定義
├── package.json
├── tsconfig.json
└── .env.example
```

## 🚀 セットアップ

### 1. フロントエンドプロジェクトの作成

#### React (Vite)
```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

#### Vue.js
```bash
npm create vue@latest frontend
cd frontend
npm install
```

#### Next.js
```bash
npx create-next-app@latest frontend --typescript --tailwind --app
cd frontend
```

### 2. API通信ライブラリのインストール

```bash
# Axios（推奨）
npm install axios

# React Query（データフェッチング）
npm install @tanstack/react-query

# 環境変数管理
npm install dotenv
```

### 3. 環境変数の設定

```bash
# .env.local (Next.js) または .env (その他)
VITE_API_URL=https://your-api-gateway-url/api
VITE_API_KEY=your-api-key
```

## 📡 API通信の実装

### APIクライアントの作成

```typescript
// src/services/api.ts
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// リクエストインターセプター
apiClient.interceptors.request.use((config) => {
  // 認証トークンの追加
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// レスポンスインターセプター
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 認証エラーの処理
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### API関数の実装

```typescript
// src/services/items.ts
import { apiClient } from './api';

export interface Item {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export const itemsApi = {
  // アイテム一覧取得
  async getAll(): Promise<Item[]> {
    const response = await apiClient.get('/items');
    return response.data;
  },

  // アイテム取得
  async getById(id: string): Promise<Item> {
    const response = await apiClient.get(`/items/${id}`);
    return response.data;
  },

  // アイテム作成
  async create(data: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>): Promise<Item> {
    const response = await apiClient.post('/items', data);
    return response.data;
  },

  // アイテム更新
  async update(id: string, data: Partial<Item>): Promise<Item> {
    const response = await apiClient.put(`/items/${id}`, data);
    return response.data;
  },

  // アイテム削除
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/items/${id}`);
  },
};
```

### React Queryの使用例

```typescript
// src/hooks/useItems.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { itemsApi } from '../services/items';

// アイテム一覧取得
export function useItems() {
  return useQuery({
    queryKey: ['items'],
    queryFn: itemsApi.getAll,
  });
}

// アイテム作成
export function useCreateItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: itemsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}
```

## 🎨 UIコンポーネントの実装

### アイテムリストコンポーネント

```tsx
// src/components/ItemList.tsx
import React from 'react';
import { useItems } from '../hooks/useItems';

export function ItemList() {
  const { data: items, isLoading, error } = useItems();

  if (isLoading) return <div>読み込み中...</div>;
  if (error) return <div>エラーが発生しました</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items?.map((item) => (
        <div key={item.id} className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold">{item.name}</h3>
          <p className="text-gray-600">{item.description}</p>
          <div className="mt-2 text-sm text-gray-500">
            作成日: {new Date(item.createdAt).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### フォームコンポーネント

```tsx
// src/components/ItemForm.tsx
import React, { useState } from 'react';
import { useCreateItem } from '../hooks/useItems';

export function ItemForm() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  
  const createMutation = useCreateItem();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync(formData);
    setFormData({ name: '', description: '' });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          名前
        </label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300"
          required
        />
      </div>
      
      <div>
        <label htmlFor="description" className="block text-sm font-medium">
          説明
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300"
          rows={3}
        />
      </div>
      
      <button
        type="submit"
        disabled={createMutation.isPending}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        {createMutation.isPending ? '作成中...' : '作成'}
      </button>
    </form>
  );
}
```

## 🚀 ビルドとデプロイ

### 1. ビルド

```bash
# React/Vue (Vite)
npm run build

# Next.js
npm run build
```

### 2. S3へのデプロイ

#### AWS CLIを使用
```bash
# ビルドファイルをS3にアップロード
aws s3 sync dist/ s3://your-frontend-bucket/ --delete

# CloudFrontのキャッシュをクリア
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

#### GitHub Actionsを使用
```yaml
# .github/workflows/deploy.yml
name: Deploy Frontend

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        env:
          VITE_API_URL: ${{ secrets.API_URL }}
          
      - name: Deploy to S3
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-northeast-1
          
      - run: |
          aws s3 sync dist/ s3://${{ secrets.S3_BUCKET }}/ --delete
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CF_DISTRIBUTION_ID }} \
            --paths "/*"
```

## 🔧 開発環境の設定

### プロキシ設定（CORS回避）

```javascript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

### 環境別設定

```typescript
// src/config/environment.ts
interface Environment {
  apiUrl: string;
  isProd: boolean;
}

const environments: Record<string, Environment> = {
  development: {
    apiUrl: 'http://localhost:3000/api',
    isProd: false,
  },
  staging: {
    apiUrl: 'https://stg-api.example.com/api',
    isProd: false,
  },
  production: {
    apiUrl: 'https://api.example.com/api',
    isProd: true,
  },
};

export const config = environments[import.meta.env.MODE] || environments.development;
```

## 🔐 認証の実装

### JWT認証

```typescript
// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../services/api';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 保存されたトークンで自動ログイン
    const token = localStorage.getItem('authToken');
    if (token) {
      fetchUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await apiClient.get('/auth/me');
      setUser(response.data);
    } catch (error) {
      localStorage.removeItem('authToken');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    const { token, user } = response.data;
    
    localStorage.setItem('authToken', token);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

## 📊 パフォーマンス最適化

### 1. コード分割

```typescript
// src/App.tsx
import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// 遅延読み込み
const Home = lazy(() => import('./pages/Home'));
const Items = lazy(() => import('./pages/Items'));
const ItemDetail = lazy(() => import('./pages/ItemDetail'));

function App() {
  return (
    <Router>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/items" element={<Items />} />
          <Route path="/items/:id" element={<ItemDetail />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
```

### 2. 画像最適化

```typescript
// src/components/OptimizedImage.tsx
interface OptimizedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export function OptimizedImage({ src, alt, width, height }: OptimizedImageProps) {
  return (
    <picture>
      <source
        srcSet={`${src}?w=${width}&format=webp`}
        type="image/webp"
      />
      <img
        src={`${src}?w=${width}`}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
      />
    </picture>
  );
}
```

### 3. データキャッシング

```typescript
// src/services/cache.ts
class CacheService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private ttl = 5 * 60 * 1000; // 5分

  set(key: string, data: any) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  get(key: string) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clear() {
    this.cache.clear();
  }
}

export const cache = new CacheService();
```

## 🧪 テスト

### ユニットテスト

```typescript
// src/components/__tests__/ItemList.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ItemList } from '../ItemList';
import { itemsApi } from '../../services/items';

jest.mock('../../services/items');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

describe('ItemList', () => {
  it('アイテムリストを表示する', async () => {
    const mockItems = [
      { id: '1', name: 'Item 1', createdAt: new Date().toISOString() },
      { id: '2', name: 'Item 2', createdAt: new Date().toISOString() },
    ];
    
    (itemsApi.getAll as jest.Mock).mockResolvedValue(mockItems);

    render(
      <QueryClientProvider client={queryClient}>
        <ItemList />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });
  });
});
```

### E2Eテスト（Playwright）

```typescript
// e2e/items.spec.ts
import { test, expect } from '@playwright/test';

test.describe('アイテム管理', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/items');
  });

  test('新しいアイテムを作成できる', async ({ page }) => {
    // フォームに入力
    await page.fill('#name', 'テストアイテム');
    await page.fill('#description', 'これはテストです');
    
    // 送信
    await page.click('button[type="submit"]');
    
    // 結果を確認
    await expect(page.locator('text=テストアイテム')).toBeVisible();
  });

  test('アイテムを削除できる', async ({ page }) => {
    // 削除ボタンをクリック
    await page.click('button[aria-label="削除"]');
    
    // 確認ダイアログ
    await page.click('text=削除する');
    
    // アイテムが消えたことを確認
    await expect(page.locator('text=テストアイテム')).not.toBeVisible();
  });
});
```

## 📚 参考リンク

- [React ドキュメント](https://ja.react.dev/)
- [Vue.js ドキュメント](https://ja.vuejs.org/)
- [Next.js ドキュメント](https://nextjs.org/docs)
- [Vite ドキュメント](https://ja.vitejs.dev/)
- [React Query ドキュメント](https://tanstack.com/query/latest)
- [Tailwind CSS](https://tailwindcss.com/)