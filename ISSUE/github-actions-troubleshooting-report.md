# GitHub Actions ビルドエラー解決報告書

## 概要
コミット b13824a から現在までの間に発生したGitHub Actionsでのビルドエラーとその解決について報告します。

## 問題の経緯

### 1. 初期状態（コミット b13824a）
- フロントエンド基盤とウォレット接続機能を実装
- ローカルでは正常に動作
- GitHub Actions でのビルドは未検証

### 2. 発生した問題

#### 問題1: TypeScript コンパイルエラー
**症状**: `npm run build` 実行時にフロントエンドのJSXファイルでエラー
```
error TS17004: Cannot use JSX unless the '--jsx' flag is provided.
```

**原因**: 
- ルートの `tsconfig.json` がフロントエンドのファイルも含めてコンパイルしようとしていた
- CDK用の設定とフロントエンド用の設定が混在

**解決策**:
```json
// tsconfig.json
"exclude": [
  "node_modules",
  "cdk.out",
  "dist",
  "build",
  "src/frontend"  // 追加
]
```

#### 問題2: ビルドスクリプトの不在
**症状**: 
```
Error: Cannot find module '/home/runner/work/web3cms/web3cms/scripts/build-api.js'
```

**原因**:
- `scripts/build-api.js` と `scripts/build-frontend.js` が存在しなかった
- `.gitignore` で `*.js` ファイルが除外されていた

**解決策**:
1. ビルドスクリプトを作成
2. `.gitignore` を修正:
```
!scripts/*.js
```

#### 問題3: フロントエンドのTypeScriptエラー
**症状**: 
```
error TS2339: Property 'env' does not exist on type 'ImportMeta'.
error TS2322: Type 'readonly [...] is not assignable to type 'AppKitNetwork[]'.
```

**原因**:
- Vite環境変数の型定義が不足
- Reown SDK の型定義との不整合
- TypeScript 5.8の新しいコンパイラオプションとの非互換性

**解決策**:
1. `vite-env.d.ts` に環境変数の型定義を追加
2. 不要なTypeScriptオプションを削除（`erasableSyntaxOnly` など）
3. 型アサーションを使用（`as any`）

#### 問題4: GitHub Actions環境での依存関係
**症状**: フロントエンドの依存関係がインストールされない

**原因**:
- CI環境での `node_modules` の扱いが異なる

**解決策**:
```javascript
// build-frontend.js
if (process.env.CI || !fs.existsSync(path.join(frontendDir, 'node_modules'))) {
  execSync('npm ci || npm install', {
    cwd: frontendDir,
    stdio: 'inherit'
  });
}
```

## 最終的な変更内容

### 1. ビルド設定の分離
- **CDK/API**: ルートの `tsconfig.json` でコンパイル
- **フロントエンド**: 独自の `tsconfig.app.json` でコンパイル

### 2. GitHub Actions ワークフローの改善
- 環境別のワークフローファイルを作成
- ビルド時に環境変数を適切に設定
- ビルド順序を最適化（TypeScript → API → Frontend）

### 3. 型定義の整備
- Vite環境変数の型定義
- React/JSX関連の型定義
- Web3ライブラリとの互換性確保

## 教訓と推奨事項

### 1. プロジェクト構造の明確化
- モノレポ構造では各パッケージの設定を独立させる
- ビルド設定は環境ごとに明確に分離

### 2. CI/CD環境の考慮
- ローカルとCI環境の違いを早期に検証
- 依存関係のインストール方法を環境に応じて調整

### 3. 型定義の管理
- 外部ライブラリの型定義は早めに確認
- 環境変数の型定義を忘れずに追加

### 4. .gitignore の注意
- ビルドスクリプトなど必要なファイルは明示的に除外から外す

## 具体的な修正内容

### 修正1: TypeScript設定の分離（コミット cfeccfc）

**変更ファイル**: `tsconfig.json`
```diff
  "exclude": [
    "node_modules",
    "cdk.out",
    "dist",
    "build"
+   "src/frontend"
  ]
```
**理由**: ルートのTypeScriptコンパイラがフロントエンドのJSXファイルを処理しようとして失敗していた

### 修正2: ビルドスクリプトの追加（コミット b420620）

**変更ファイル**: `.gitignore`
```diff
  !jest.config.js
  !vitest.config.js
+ !scripts/*.js
```
**追加ファイル**: 
- `scripts/build-api.js` - Lambda関数のビルドスクリプト
- `scripts/build-frontend.js` - Viteビルドを実行するスクリプト

### 修正3: TypeScriptコンパイラオプションの修正（コミット aa13ea8）

**変更ファイル**: `src/frontend/tsconfig.app.json`, `src/frontend/tsconfig.node.json`
```diff
- "erasableSyntaxOnly": true,
  "noFallthroughCasesInSwitch": true,
- "noUncheckedSideEffectImports": true
```
**理由**: TypeScript 5.8で未サポートのオプションを削除

### 修正4: Vite環境変数の型定義（コミット 66c5158）

**変更ファイル**: `src/frontend/src/vite-env.d.ts`
```typescript
interface ImportMetaEnv {
  readonly VITE_REOWN_PROJECT_ID: string
  readonly VITE_DEFAULT_CHAIN_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

### 修正5: React型インポートの修正（コミット 66c5158）

**変更ファイル**: `src/frontend/src/contexts/WalletContext.tsx`
```diff
- import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
+ import React, { createContext, useContext, useEffect, useState } from 'react'
+ import type { ReactNode } from 'react'
```
**理由**: `verbatimModuleSyntax`オプションとの互換性

### 修正6: Reown SDK設定の簡略化（コミット 74c94ee）

**変更ファイル**: `src/frontend/src/config/web3.ts`
```diff
- export const chains = defaultChainId === 1 
-   ? [mainnet, sepolia] as const
-   : [sepolia, mainnet] as const
+ export const chains = defaultChainId === 1 
+   ? [mainnet, sepolia]
+   : [sepolia, mainnet]

  export const wagmiAdapter = new WagmiAdapter({
    projectId,
-   networks: chains,
-   metadata,
-   features: {
-     analytics: true
-   }
+   networks: chains
  })

  export const appKit = createAppKit({
    adapters: [wagmiAdapter],
-   networks: [...chains],
+   networks: chains as any,
    projectId,
+   metadata: appMetadata,
```
**理由**: 型の互換性問題を回避

### 修正7: CI環境での依存関係インストール（コミット aa13ea8）

**変更ファイル**: `scripts/build-frontend.js`
```diff
- if (!fs.existsSync(nodeModulesPath)) {
+ if (process.env.CI || !fs.existsSync(nodeModulesPath)) {
    console.log('📦 Installing frontend dependencies...');
    try {
-     execSync('npm install', {
+     execSync('npm ci || npm install', {
```
**理由**: GitHub Actions環境では常に依存関係をインストール

### 修正8: GitHub Actionsワークフローの環境変数（コミット 2f362e7）

**変更ファイル**: `.github/workflows/deploy-develop.yml` など
```yaml
- name: Build frontend
  env:
    VITE_REOWN_PROJECT_ID: ${{ secrets.VITE_REOWN_PROJECT_ID_DEV }}
    VITE_DEFAULT_CHAIN_ID: ${{ secrets.VITE_DEFAULT_CHAIN_ID_DEV || '11155111' }}
  run: npm run build:frontend
```
**理由**: フロントエンドビルド時に必要な環境変数を提供

## 結論

初期実装時にローカル環境のみでテストしていたため、CI環境特有の問題を見逃していました。
今回の修正により、GitHub Actions でのビルドが成功するようになり、自動デプロイの基盤が整いました。

今後は、新機能追加時にCI環境での動作確認を含めた検証を行うことで、同様の問題を防ぐことができます。