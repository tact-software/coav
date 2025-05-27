# COAVビルドガイド

[English](./BUILD.en.md) | **日本語**

このドキュメントでは、COAVをソースからビルドする詳細な手順を説明します。

## 目次

- [前提条件](#前提条件)
- [開発環境のセットアップ](#開発環境のセットアップ)
- [依存関係のインストール](#依存関係のインストール)
- [ビルド手順](#ビルド手順)
- [プラットフォーム別の注意事項](#プラットフォーム別の注意事項)
- [トラブルシューティング](#トラブルシューティング)

## 前提条件

### 必須ソフトウェア

| ソフトウェア                       | 最小バージョン | 推奨バージョン | 用途                   |
| ---------------------------------- | -------------- | -------------- | ---------------------- |
| [Rust](https://www.rust-lang.org/) | 1.70           | 最新安定版     | Tauriバックエンド      |
| [Node.js](https://nodejs.org/)     | 18.0           | 20.x LTS       | フロントエンドビルド   |
| [Bun](https://bun.sh/)             | 1.0            | 最新版         | パッケージ管理（推奨） |
| [Git](https://git-scm.com/)        | 2.0            | 最新版         | ソースコード管理       |

### オプション（推奨）

- [mise](https://mise.jdx.dev/) - ランタイムバージョン管理
- [Visual Studio Code](https://code.visualstudio.com/) - 推奨エディタ

## 開発環境のセットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/tact-software/coav.git
cd coav
```

### 2. mise を使用した環境構築（推奨）

```bash
# mise のインストール（未インストールの場合）
curl https://mise.run | sh

# 必要なツールのインストール
mise install

# 環境の確認
mise list
```

### 3. 手動での環境構築

#### Rust のインストール

```bash
# rustup を使用してインストール
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 環境変数の設定
source $HOME/.cargo/env

# バージョン確認
rustc --version
cargo --version
```

#### Bun のインストール

```bash
# macOS/Linux
curl -fsSL https://bun.sh/install | bash

# Windows (PowerShell)
irm bun.sh/install.ps1 | iex

# バージョン確認
bun --version
```

## 依存関係のインストール

### フロントエンド依存関係

```bash
# Bun を使用（推奨）
bun install

# または npm を使用
npm install

# または yarn を使用
yarn install
```

### Rust 依存関係

```bash
cd src-tauri
cargo fetch
cd ..
```

## ビルド手順

### 開発ビルド

開発サーバーを起動してホットリロードを有効にします：

```bash
# Tauri開発モード（推奨）
bun tauri:dev

# または個別に起動
# ターミナル1: フロントエンド開発サーバー
bun dev

# ターミナル2: Tauriアプリケーション
cd src-tauri
cargo tauri dev
```

### プロダクションビルド

最適化されたバイナリを作成します：

```bash
# すべてのプラットフォーム向け
bun tauri:build

# ビルド結果の確認
ls -la src-tauri/target/release/
```

### ビルドオプション

```bash
# デバッグ情報付きビルド
bun tauri:build --debug

# 特定のターゲット向けビルド
bun tauri:build --target x86_64-pc-windows-msvc

# 詳細ログ付きビルド
RUST_LOG=debug bun tauri:build
```

## プラットフォーム別の注意事項

### Windows

#### 必要な追加ツール

- [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- WebView2（Windows 10以降は標準搭載）

#### インストール手順

```powershell
# Chocolatey を使用した場合
choco install visualstudio2022-workload-vctools

# または Visual Studio Installer から
# "C++ によるデスクトップ開発" ワークロードを選択
```

### macOS

#### 必要な追加ツール

- Xcode Command Line Tools

#### インストール手順

```bash
# Xcode Command Line Tools のインストール
xcode-select --install

# ライセンスの承認
sudo xcodebuild -license accept
```

#### 署名とNotarization（配布用）

```bash
# 開発者証明書の確認
security find-identity -v -p codesigning

# 署名付きビルド
bun tauri:build -- --sign
```

### Linux

#### Ubuntu/Debian

```bash
# 必要なシステムパッケージ
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  libgtk-3-dev
```

#### Fedora

```bash
# 必要なシステムパッケージ
sudo dnf install -y \
  webkit2gtk4.1-devel \
  openssl-devel \
  curl \
  wget \
  file \
  libappindicator-gtk3-devel \
  librsvg2-devel \
  gtk3-devel
```

#### Arch Linux

```bash
# 必要なシステムパッケージ
sudo pacman -S --needed \
  webkit2gtk-4.1 \
  base-devel \
  curl \
  wget \
  file \
  openssl \
  libappindicator-gtk3 \
  librsvg \
  gtk3
```

## トラブルシューティング

### よくある問題と解決方法

#### 1. Rust のビルドエラー

```bash
# キャッシュのクリア
cargo clean

# 依存関係の再取得
cargo update

# 詳細ログでビルド
RUST_BACKTRACE=1 cargo build
```

#### 2. Node.js/Bun の問題

```bash
# node_modules の削除と再インストール
rm -rf node_modules bun.lock
bun install

# キャッシュのクリア
bun pm cache rm
```

#### 3. Tauri 固有の問題

```bash
# Tauri CLI の再インストール
bun add -D @tauri-apps/cli@latest

# 設定の検証
bun tauri info
```

#### 4. Linux でのWebKitGTK問題

```bash
# バージョンの確認
pkg-config --modversion webkit2gtk-4.1

# 環境変数の設定
export PKG_CONFIG_PATH="/usr/lib/pkgconfig:$PKG_CONFIG_PATH"
```

### デバッグビルド

開発中の問題を調査する場合：

```bash
# Rust のデバッグログ
RUST_LOG=debug bun tauri:dev

# フロントエンドのソースマップ付きビルド
GENERATE_SOURCEMAP=true bun build
```

### パフォーマンス最適化ビルド

```bash
# リリースビルドの最適化
RUSTFLAGS="-C target-cpu=native" bun tauri:build

# LTOを有効にしたビルド
# src-tauri/Cargo.toml に以下を追加:
# [profile.release]
# lto = true
# opt-level = 3
```

## 次のステップ

- [CONTRIBUTING.md](./CONTRIBUTING.md) - 貢献方法
- [README.md](./README.md) - 使用方法
- [Architecture.md](./docs/Architecture.md) - アーキテクチャ詳細

## ヘルプとサポート

問題が解決しない場合は：

1. [GitHub Issues](https://github.com/tact-software/coav/issues) で既存の問題を検索
2. [Discussions](https://github.com/tact-software/coav/discussions) で質問
3. 新しいIssueを作成（再現手順を含めてください）
