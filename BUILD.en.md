# COAV Build Guide

**English** | [日本語](./BUILD.md)

This document provides detailed instructions for building COAV from source.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Development Environment Setup](#development-environment-setup)
- [Installing Dependencies](#installing-dependencies)
- [Build Instructions](#build-instructions)
- [Platform-Specific Notes](#platform-specific-notes)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

| Software                           | Minimum Version | Recommended Version | Purpose                          |
| ---------------------------------- | --------------- | ------------------- | -------------------------------- |
| [Rust](https://www.rust-lang.org/) | 1.70            | Latest stable       | Tauri backend                    |
| [Node.js](https://nodejs.org/)     | 18.0            | 20.x LTS            | Frontend build                   |
| [Bun](https://bun.sh/)             | 1.0             | Latest              | Package management (recommended) |
| [Git](https://git-scm.com/)        | 2.0             | Latest              | Source control                   |

### Optional (Recommended)

- [mise](https://mise.jdx.dev/) - Runtime version management
- [Visual Studio Code](https://code.visualstudio.com/) - Recommended editor

## Development Environment Setup

### 1. Clone the Repository

```bash
git clone https://github.com/tact-software/coav.git
cd coav
```

### 2. Setup with mise (Recommended)

```bash
# Install mise (if not already installed)
curl https://mise.run | sh

# Install required tools
mise install

# Verify environment
mise list
```

### 3. Manual Setup

#### Install Rust

```bash
# Install via rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Set environment variables
source $HOME/.cargo/env

# Verify installation
rustc --version
cargo --version
```

#### Install Bun

```bash
# macOS/Linux
curl -fsSL https://bun.sh/install | bash

# Windows (PowerShell)
irm bun.sh/install.ps1 | iex

# Verify installation
bun --version
```

## Installing Dependencies

### Frontend Dependencies

```bash
# Using Bun (recommended)
bun install

# Or using npm
npm install

# Or using yarn
yarn install
```

### Rust Dependencies

```bash
cd src-tauri
cargo fetch
cd ..
```

## Build Instructions

### Development Build

Start the development server with hot reload:

```bash
# Tauri dev mode (recommended)
bun tauri:dev

# Or run separately
# Terminal 1: Frontend dev server
bun dev

# Terminal 2: Tauri application
cd src-tauri
cargo tauri dev
```

### Production Build

Create optimized binaries:

```bash
# For all platforms
bun tauri:build

# Check build output
ls -la src-tauri/target/release/
```

### Build Options

```bash
# Build with debug info
bun tauri:build --debug

# Build for specific target
bun tauri:build --target x86_64-pc-windows-msvc

# Build with verbose logging
RUST_LOG=debug bun tauri:build
```

## Platform-Specific Notes

### Windows

#### Additional Requirements

- [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- WebView2 (included in Windows 10 and later)

#### Installation Steps

```powershell
# Using Chocolatey
choco install visualstudio2022-workload-vctools

# Or via Visual Studio Installer
# Select "Desktop development with C++" workload
```

### macOS

#### Additional Requirements

- Xcode Command Line Tools

#### Installation Steps

```bash
# Install Xcode Command Line Tools
xcode-select --install

# Accept license
sudo xcodebuild -license accept
```

#### Code Signing and Notarization (for distribution)

```bash
# Check developer certificates
security find-identity -v -p codesigning

# Build with signing
bun tauri:build -- --sign
```

### Linux

#### Ubuntu/Debian

```bash
# Required system packages
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
# Required system packages
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
# Required system packages
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

## Troubleshooting

### Common Issues and Solutions

#### 1. Rust Build Errors

```bash
# Clear cache
cargo clean

# Update dependencies
cargo update

# Build with detailed logs
RUST_BACKTRACE=1 cargo build
```

#### 2. Node.js/Bun Issues

```bash
# Remove and reinstall node_modules
rm -rf node_modules bun.lock
bun install

# Clear cache
bun pm cache rm
```

#### 3. Tauri-Specific Issues

```bash
# Reinstall Tauri CLI
bun add -D @tauri-apps/cli@latest

# Verify configuration
bun tauri info
```

#### 4. WebKitGTK Issues on Linux

```bash
# Check version
pkg-config --modversion webkit2gtk-4.1

# Set environment variable
export PKG_CONFIG_PATH="/usr/lib/pkgconfig:$PKG_CONFIG_PATH"
```

### Debug Builds

For investigating issues during development:

```bash
# Rust debug logging
RUST_LOG=debug bun tauri:dev

# Frontend build with source maps
GENERATE_SOURCEMAP=true bun build
```

### Performance-Optimized Builds

```bash
# Release build optimization
RUSTFLAGS="-C target-cpu=native" bun tauri:build

# Build with LTO enabled
# Add to src-tauri/Cargo.toml:
# [profile.release]
# lto = true
# opt-level = 3
```

## Next Steps

- [CONTRIBUTING.md](./CONTRIBUTING.md) - How to contribute
- [README.md](./README.md) - Usage guide
- [Architecture.md](./docs/Architecture.md) - Architecture details

## Help and Support

If you encounter issues:

1. Search existing issues on [GitHub Issues](https://github.com/tact-software/coav/issues)
2. Ask questions in [Discussions](https://github.com/tact-software/coav/discussions)
3. Create a new issue with reproduction steps
