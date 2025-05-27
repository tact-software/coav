# リリースプロセス

このドキュメントは、COAVのメンテナー向けのリリースプロセスを説明します。

## リリースの種類

セマンティックバージョニング（SemVer）に従います：

- **メジャーリリース (x.0.0)**: 破壊的変更を含む
- **マイナーリリース (0.x.0)**: 後方互換性のある機能追加
- **パッチリリース (0.0.x)**: 後方互換性のあるバグ修正

## リリース準備

### 1. ブランチの準備

```bash
# 最新のmainブランチを取得
git checkout main
git pull origin main

# リリースブランチを作成
git checkout -b release/v1.0.0
```

### 2. バージョン更新

#### 自動更新（推奨）

バージョン更新スクリプトを使用：

```bash
# Node.js版（クロスプラットフォーム、推奨）
bun version:update 1.0.0

# または Bash版（Linux/macOS）
bun version:update:sh 1.0.0
```

このスクリプトは以下のファイルを自動的に更新します：

- `package.json`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`

#### 手動更新

スクリプトが使用できない場合は、以下のファイルを手動で更新：

```bash
# package.json
{
  "version": "1.0.0"
}

# src-tauri/Cargo.toml
version = "1.0.0"

# src-tauri/tauri.conf.json
{
  "version": "1.0.0"
}
```

### 3. CHANGELOG.md の更新

```markdown
## [1.0.0] - 2024-01-01

### 追加

- 新機能の説明

### 変更

- 変更内容の説明

### 修正

- バグ修正の説明

### 削除

- 削除された機能
```

### 4. ビルドとテスト

```bash
# クリーンビルド
rm -rf node_modules src-tauri/target
bun install
bun tauri:build

# テスト実行（実装時）
bun test
bun test:e2e
```

## リリース実行

### 1. コミットとタグ

```bash
# 変更をコミット
git add .
git commit -m "chore: release v1.0.0"

# タグを作成
git tag -a v1.0.0 -m "Release version 1.0.0"
```

### 2. プッシュ

```bash
# ブランチをプッシュ
git push origin release/v1.0.0

# タグをプッシュ
git push origin v1.0.0
```

### 3. プルリクエスト

- `release/v1.0.0` から `main` へのPRを作成
- レビューを受ける
- マージ

### 4. GitHubリリースの作成

1. [Releases](https://github.com/tact-software/coav/releases)ページへアクセス
2. "Draft a new release"をクリック
3. タグ `v1.0.0` を選択
4. リリースタイトル: "COAV v1.0.0"
5. CHANGELOG.mdの内容をコピー
6. "Publish release"をクリック

## リリース後の作業

### 1. 次バージョンの準備

```bash
git checkout main
git pull origin main

# 開発バージョンに更新（例: 1.0.1-dev）
bun version:update 1.0.1-dev

# コミット
git add .
git commit -m "chore: prepare for next development iteration"
```

### 2. アナウンス

- [ ] プロジェクトWebサイトの更新
- [ ] ソーシャルメディアでの告知
- [ ] 主要な変更がある場合はブログ記事

### 3. 問題の監視

- GitHub Issuesで新しい問題を監視
- 重大なバグがある場合は迅速にパッチリリース

## 緊急パッチリリース

重大なバグやセキュリティ問題の場合：

```bash
# 最新のリリースタグから開始
git checkout v1.0.0
git checkout -b hotfix/v1.0.1

# 修正を適用
# ...

# バージョンを更新してリリース
git tag -a v1.0.1 -m "Hotfix: 重大なバグの修正"
git push origin v1.0.1
```

## チェックリスト

リリース前の最終確認：

- [ ] すべてのテストが通る
- [ ] ビルドが成功する
- [ ] CHANGELOG.mdが更新されている
- [ ] バージョン番号が一致している
  - [ ] package.json
  - [ ] src-tauri/Cargo.toml
  - [ ] src-tauri/tauri.conf.json
- [ ] ドキュメントが最新
- [ ] ライセンス情報が正しい
- [ ] 依存関係が最新（セキュリティパッチ）

## 自動化の提案

将来的に以下の自動化を検討：

- GitHub Actionsによるリリースビルド
- 自動的なCHANGELOG生成
- バージョン番号の自動同期
- リリースノートの自動生成
