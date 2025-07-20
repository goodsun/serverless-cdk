# コントリビューションガイド

serverless-cdkへの貢献を検討いただき、ありがとうございます！

## 行動規範

このプロジェクトに参加するすべての人は、お互いを尊重し、建設的な環境を維持することが求められます。

## 貢献の方法

### バグ報告

1. 既存のIssueを確認して、同じ問題が報告されていないか確認してください
2. 新しいIssueを作成する際は、以下の情報を含めてください：
   - 問題の明確な説明
   - 再現手順
   - 期待される動作
   - 実際の動作
   - 環境情報（OS、Node.jsバージョン、CDKバージョンなど）

### 機能提案

1. 既存のIssueやディスカッションを確認してください
2. 新しい機能提案のIssueを作成し、以下を含めてください：
   - 機能の概要
   - ユースケース
   - 実装案（あれば）

### プルリクエスト

1. フォークしてブランチを作成
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. コードを変更
   - コーディング規約に従ってください
   - テストを追加してください
   - ドキュメントを更新してください

3. コミット
   ```bash
   git commit -m 'Add: 素晴らしい新機能'
   ```

4. プッシュ
   ```bash
   git push origin feature/amazing-feature
   ```

5. プルリクエストを作成

## コーディング規約

### TypeScript

- ESLintルールに従う
- 型定義を明確にする
- エラーハンドリングを適切に行う

```typescript
// 良い例
export interface Item {
  id: string;
  name: string;
  description?: string;
}

export async function getItem(id: string): Promise<Item | null> {
  try {
    // 処理
  } catch (error) {
    logger.error('Failed to get item', { id, error });
    throw error;
  }
}
```

### コミットメッセージ

以下の形式に従ってください：

```
<type>: <subject>

<body>

<footer>
```

タイプ：
- `Add:` 新機能
- `Fix:` バグ修正
- `Update:` 機能改善
- `Remove:` 機能削除
- `Docs:` ドキュメント
- `Test:` テスト
- `Refactor:` リファクタリング

例：
```
Add: DynamoDB自動バックアップ機能

本番環境でDynamoDBテーブルの日次バックアップを自動化する機能を追加。
Point-in-Timeリカバリも有効化。

Closes #123
```

## テスト

### ユニットテスト

```bash
npm test
```

### 統合テスト

```bash
npm run test:integration
```

### カバレッジ

```bash
npm run test:coverage
```

最低80%のカバレッジを維持してください。

## ドキュメント

以下の場合はドキュメントの更新が必要です：

- 新機能の追加
- APIの変更
- 設定オプションの追加
- 使用方法の変更

## リリースプロセス

1. `main`ブランチへのマージ
2. セマンティックバージョニングに従ったタグ付け
3. CHANGELOGの更新
4. npm公開

## 質問・相談

- GitHub Discussions を使用してください
- 日本語・英語どちらでも構いません

## ライセンス

貢献されたコードは、プロジェクトと同じMITライセンスの下で公開されます。

## 謝辞

すべての貢献者に感謝します！