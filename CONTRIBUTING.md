# COAVへの貢献ガイド

[English](./CONTRIBUTING.en.md) | **日本語**

COAVプロジェクトへの貢献に興味を持っていただき、ありがとうございます！このガイドでは、プロジェクトへの貢献方法について説明します。

## 目次

- [行動規範](#行動規範)
- [貢献の方法](#貢献の方法)
- [開発環境のセットアップ](#開発環境のセットアップ)
- [開発ワークフロー](#開発ワークフロー)
- [コーディング規約](#コーディング規約)
- [コミットメッセージ](#コミットメッセージ)
- [プルリクエスト](#プルリクエスト)
- [Issue報告](#issue報告)
- [質問とサポート](#質問とサポート)

## 行動規範

このプロジェクトは[行動規範](./CODE_OF_CONDUCT.md)を採用しています。プロジェクトに参加することで、この規範を遵守することに同意したものとみなされます。

## 貢献の方法

COAVへの貢献方法はいくつかあります：

### 🐛 バグ報告

- バグを見つけたら、まず既存のIssueを確認してください
- 同様の報告がない場合は、新しいIssueを作成してください
- バグ報告テンプレートを使用し、可能な限り詳細な情報を提供してください

### 💡 機能提案

- 新機能のアイデアがある場合は、まずDiscussionsで議論することをお勧めします
- 合意が得られたら、機能要望のIssueを作成してください

### 📖 ドキュメント改善

- タイポの修正
- 説明の改善
- 新しい例の追加
- 翻訳の改善

### 💻 コード貢献

- バグ修正
- 新機能の実装
- パフォーマンス改善
- テストの追加

## 開発環境のセットアップ

### 前提条件

- [Git](https://git-scm.com/)
- [Rust](https://www.rust-lang.org/) 1.70以上
- [Node.js](https://nodejs.org/) 18以上 または [Bun](https://bun.sh/)
- [mise](https://mise.jdx.dev/)（推奨）

### セットアップ手順

1. リポジトリをフォーク

```bash
# GitHubでフォークボタンをクリック
```

2. フォークしたリポジトリをクローン

```bash
git clone https://github.com/your-username/coav.git
cd coav
```

3. アップストリームを追加

```bash
git remote add upstream https://github.com/tact-software/coav.git
```

4. 依存関係をインストール

```bash
# miseを使用（推奨）
mise install

# 依存関係のインストール
bun install
```

5. 開発サーバーを起動

```bash
bun tauri:dev
```

## 開発ワークフロー

### 1. ブランチの作成

```bash
# 最新のmainブランチを取得
git checkout main
git pull upstream main

# フィーチャーブランチを作成
git checkout -b feature/your-feature-name
```

ブランチ名の規則：

- `feature/` - 新機能
  - 例: `feature/auto-update`, `feature/123-screenshot-tool`
- `fix/` - バグ修正
  - 例: `fix/memory-leak`, `fix/456-panel-crash`
- `docs/` - ドキュメント
  - 例: `docs/api-guide`, `docs/readme-update`
- `refactor/` - リファクタリング
  - 例: `refactor/component-structure`
- `test/` - テスト追加
  - 例: `test/unit-tests`, `test/e2e-setup`
- `chore/` - その他の変更
  - 例: `chore/dependencies-update`
- `hotfix/` - 緊急修正（mainブランチから）
  - 例: `hotfix/1.0.1-critical-bug`
- `release/` - リリース準備
  - 例: `release/v1.1.0`

### 2. 開発

```bash
# 開発サーバーを起動
bun tauri:dev

# コードをフォーマット
bun format

# Lintチェック
bun lint

# テスト実行 (未実装)
bun test
```

### 3. コミット

```bash
# 変更をステージング
git add .

# コミット（後述のコミットメッセージ規約に従う）
git commit -m "feat: add new feature"
```

### 4. プッシュとPR作成

```bash
# フォークしたリポジトリにプッシュ
git push origin feature/your-feature-name
```

GitHubでプルリクエストを作成してください。

## コーディング規約

### TypeScript/JavaScript

- ESLintとPrettierの設定に従ってください
- 型安全性を重視し、`any`型の使用は避けてください
- 関数やクラスには適切なコメントを追加してください

```typescript
/**
 * カテゴリIDから色を生成する
 * @param categoryId - カテゴリの識別子
 * @returns HSL形式の色文字列
 */
export const generateCategoryColor = (categoryId: number): string => {
  const hue = (categoryId * 137.5) % 360;
  return `hsl(${hue}, 50%, 50%)`;
};
```

### Rust

- `cargo fmt`でフォーマット
- `cargo clippy`でLintチェック
- 安全なコードを心がけ、`unsafe`の使用は最小限に

```rust
/// ファイルから画像を読み込む
///
/// # Arguments
/// * `file_path` - 画像ファイルのパス
///
/// # Returns
/// * `Result<Vec<u8>, String>` - 画像データまたはエラーメッセージ
#[tauri::command]
pub fn load_image(file_path: &str) -> Result<Vec<u8>, String> {
    // 実装
}
```

### CSS

- CSS Modulesまたはstyled-componentsを使用
- BEM命名規則に従う
- CSS変数を活用してテーマ対応

```css
/* 良い例 */
.annotation-layer {
  --annotation-opacity: 0.6;
  position: absolute;
  opacity: var(--annotation-opacity);
}

.annotation-layer__item {
  cursor: pointer;
}

.annotation-layer__item--selected {
  outline: 2px solid var(--primary-color);
}
```

## コミットメッセージ

[Conventional Commits](https://www.conventionalcommits.org/)の規約に従ってください。

### フォーマット

```
<type>(<scope>): <subject>

<body>

<footer>
```

### タイプ

- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメントのみの変更
- `style`: コードの意味に影響しない変更（空白、フォーマット等）
- `refactor`: バグ修正や機能追加を含まないコード変更
- `perf`: パフォーマンス改善
- `test`: テストの追加・修正
- `chore`: ビルドプロセスや補助ツールの変更

### 例

```
feat(annotation): カテゴリ別カラーパレット機能を追加

- カラー設定タブを実装
- カテゴリごとの色をカスタマイズ可能に
- 透明度設定を統合

Closes #123
```

```
fix(viewer): 大規模データセットでのメモリリークを修正

未使用のCanvasコンテキストが解放されない問題を修正。
useEffectのクリーンアップ関数でリソースを適切に解放するように変更。

Fixes #456
```

## プルリクエスト

### PR作成前のチェックリスト

- [ ] コードがビルドできる（`bun tauri:build`）
- [ ] すべてのテストが通る（`bun test`）※テスト環境構築中
- [ ] Lintエラーがない（`bun lint`）
- [ ] フォーマット済み（`bun format`）
- [ ] 関連するドキュメントを更新した
- [ ] 必要に応じてテストを追加した ※テスト環境構築中
- [ ] コミットメッセージが規約に従っている

### PRテンプレート

```markdown
## 概要

<!-- この変更の概要を説明してください -->

## 変更内容

<!-- 具体的な変更内容をリストアップしてください -->

-
-
-

## 関連Issue

<!-- 関連するIssue番号を記載してください -->

Closes #

## スクリーンショット

<!-- UI変更の場合は、変更前後のスクリーンショットを添付してください -->

## テスト方法

<!-- この変更をテストする方法を説明してください -->

1.
2.
3.

## チェックリスト

- [ ] コードがビルドできる
- [ ] テストが通る
- [ ] Lintエラーがない
- [ ] ドキュメントを更新した
```

### レビュープロセス

1. PRを作成すると、自動的にCIが実行されます
2. コードレビューを受けます
3. 必要に応じて修正を行います
4. 承認後、メンテナーがマージします

## Issue報告

### バグ報告テンプレート

```markdown
## バグの説明

<!-- バグの内容を明確に説明してください -->

## 再現手順

1.
2.
3.

## 期待される動作

<!-- 本来どのように動作すべきか -->

## 実際の動作

<!-- 実際にどのような動作をしたか -->

## 環境

- OS: [例: Windows 11, macOS 13.0, Ubuntu 22.04]
- COAVバージョン: [例: 1.0.0]
- 画面解像度: [例: 1920x1080]

## スクリーンショット

<!-- 可能であればスクリーンショットを添付 -->

## 追加情報

<!-- その他の関連情報 -->
```

### 機能要望テンプレート

```markdown
## 機能の説明

<!-- 提案する機能を説明してください -->

## 動機

<!-- なぜこの機能が必要か -->

## 提案する解決策

<!-- どのように実装すべきか -->

## 代替案

<!-- 検討した他の方法があれば -->

## 追加情報

<!-- その他の関連情報 -->
```

## 質問とサポート

- **一般的な質問**: [Discussions](https://github.com/tact-software/coav/discussions)を使用してください
- **バグ報告**: [Issues](https://github.com/tact-software/coav/issues)を作成してください
- **セキュリティの問題**: [SECURITY.md](./SECURITY.md)を参照してください

## ライセンス

貢献していただいたコードは、プロジェクトと同じ[MITライセンス](./LICENSE)の下でリリースされます。

---

ご質問がある場合は、お気軽にDiscussionsでお尋ねください。COAVプロジェクトへの貢献をお待ちしています！ 🎉
