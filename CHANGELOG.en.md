# Changelog

**English** | [日本語](./CHANGELOG.md)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

### Fixed

### Removed

## [1.0.0] - 2024-XX-XX

### Added

- 🎉 Initial release
- **Core Features**
  - COCO format JSON file loading
  - Image and annotation display
  - Bounding box rendering
  - Segmentation (polygon) rendering
  - Multi-image annotation support
- **UI/UX Features**
  - Zoom and pan functionality
  - Annotation selection and highlighting
  - Category-based filtering
  - Search by ID and category name
  - Detail information panel
  - Statistics display
  - Dark/Light theme switching
- **Customization Features**
  - Category-specific color palette settings
  - Fill and stroke opacity adjustment
  - Label display toggle
  - Bounding box display toggle
- **Other Features**
  - Drag & drop support
  - Recent file history
  - Multi-language support (Japanese/English)
  - Keyboard shortcuts
  - Responsive design

### Technical Specifications

- Desktop application built with Tauri 2.0
- React 18 + TypeScript
- High-performance Canvas rendering with Konva.js
- State management with Zustand
- Cross-platform support (Windows, macOS, Linux)

[Unreleased]: https://github.com/tact-software/coav/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/tact-software/coav/releases/tag/v1.0.0
