# Changelog

**English** | [日本語](./CHANGELOG.md)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2025-06-20

### Added

- **Multi-Image Navigation**
  - **Navigation Panel**: New panel for easy navigation between images in a folder
  - **Image List Display**: Image list and status indicators
  - **ID Jump Feature**: Direct navigation to specific image by entering image ID
  - **Smart Navigation**: Automatically skip non-existent images
  - **View State Preservation**: Maintain zoom and pan state when switching images
  - **Comparison Mode Support**: Navigate between images while comparing, with dynamic pair annotation updates
  - **Keyboard Shortcuts**: Arrow keys for previous/next image navigation
- **Annotation Statistical Analysis**
  - **Histogram Analysis**: 5 distribution types (width, height, area, polygon area, aspect ratio)
  - **Heatmap Analysis**: 4 2D distributions (width×height, center coordinates, area×aspect ratio, etc.)
  - **Detailed Statistics**: Display of mean, median, standard deviation, skewness, kurtosis, quartiles, etc.
  - **Polygon Area Calculation**: Accurate segmentation area calculation using Shoelace formula
  - **Data Export**: Clipboard copy functionality for statistical data
  - **Menu Integration**: Shortcuts for Histogram (Ctrl/Cmd+Shift+H) and Heatmap (Ctrl/Cmd+Shift+M)
- **Common Modal Component**
  - Unified modal design with blur background effects
  - Responsive size support (sm, md, lg, xl)
  - Accessibility support (ESC key, overlay click)
- **Comparison Mode**
  - Visual comparison between two COCO datasets (ground truth vs predictions)
  - Color-coded display of TP (True Positive), FP (False Positive), and FN (False Negative)
  - IoU threshold-based matching algorithm
  - Category mapping between different category systems
  - Two IoU calculation methods: Bounding box IoU and Polygon IoU (approximation)
  - Multiple matching support (1-to-many matching configuration)
- **Evaluation Metrics Display**
  - Calculation and display of Precision, Recall, and F1 score
  - Comparison results in statistics dialog
  - Matching information in annotation detail panel
- **Sample Data Generation Enhancement**
  - Pair JSON generation option for comparison testing
  - Detailed matching distribution settings
- **Loading Overlay**
  - Full-screen loading display for long-running operations
- **Disclaimer Addition**
  - Added disclaimer in README stating statistical information is for reference purposes with developer liability limitations

### Changed

- Improved zoom buttons to zoom relative to viewport center
- Auto-adjust view mode for single image datasets in statistics dialog
- Enhanced comparison mode data management with original data preservation
- Updated panel settings UI to place NavigationPanel as an independent tab

### Fixed

- Fixed infinite loop issue after category mapping
- Fixed comparison results not showing for single image datasets
- Enabled comparison between datasets with different image IDs
- Fixed ReferenceError during NavigationPanel initialization
- Fixed zoom/pan state reset when switching images
- Fixed annotation data loss when changing comparison settings
- Prevented unnecessary image ID reset when switching tabs

### Removed

## [1.0.0] - 2025-05-27

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

[Unreleased]: https://github.com/tact-software/coav/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/tact-software/coav/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/tact-software/coav/releases/tag/v1.0.0
