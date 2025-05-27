# Release Process

This document describes the release process for COAV maintainers.

## Release Types

Following Semantic Versioning (SemVer):

- **Major Release (x.0.0)**: Contains breaking changes
- **Minor Release (0.x.0)**: Backward-compatible feature additions
- **Patch Release (0.0.x)**: Backward-compatible bug fixes

## Release Preparation

### 1. Branch Preparation

```bash
# Get latest main branch
git checkout main
git pull origin main

# Create release branch
git checkout -b release/v1.0.0
```

### 2. Version Update

#### Automatic Update (Recommended)

Use the version update script:

```bash
# Node.js version (cross-platform, recommended)
bun version:update 1.0.0

# Or Bash version (Linux/macOS)
bun version:update:sh 1.0.0
```

This script automatically updates:

- `package.json`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`

#### Manual Update

If the script is not available, manually update these files:

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

### 3. Update CHANGELOG.md

```markdown
## [1.0.0] - 2024-01-01

### Added

- Description of new features

### Changed

- Description of changes

### Fixed

- Description of bug fixes

### Removed

- Removed features
```

### 4. Build and Test

```bash
# Clean build
rm -rf node_modules src-tauri/target
bun install
bun tauri:build

# Run tests (when implemented)
bun test
bun test:e2e
```

## Release Execution

### 1. Commit and Tag

```bash
# Commit changes
git add .
git commit -m "chore: release v1.0.0"

# Create tag
git tag -a v1.0.0 -m "Release version 1.0.0"
```

### 2. Push

```bash
# Push branch
git push origin release/v1.0.0

# Push tag
git push origin v1.0.0
```

### 3. Pull Request

- Create PR from `release/v1.0.0` to `main`
- Get review
- Merge

### 4. Create GitHub Release

1. Go to [Releases](https://github.com/tact-software/coav/releases) page
2. Click "Draft a new release"
3. Select tag `v1.0.0`
4. Release title: "COAV v1.0.0"
5. Copy content from CHANGELOG.md
6. Click "Publish release"

## Post-Release Tasks

### 1. Prepare Next Version

```bash
git checkout main
git pull origin main

# Update to development version (e.g., 1.0.1-dev)
bun version:update 1.0.1-dev

# Commit
git add .
git commit -m "chore: prepare for next development iteration"
```

### 2. Announcements

- [ ] Update project website
- [ ] Social media announcements
- [ ] Blog post for major changes

### 3. Monitor Issues

- Monitor GitHub Issues for new problems
- Quick patch release for critical bugs

## Emergency Patch Release

For critical bugs or security issues:

```bash
# Start from latest release tag
git checkout v1.0.0
git checkout -b hotfix/v1.0.1

# Apply fixes
# ...

# Update version and release
git tag -a v1.0.1 -m "Hotfix: Critical bug fix"
git push origin v1.0.1
```

## Checklist

Final checks before release:

- [ ] All tests pass
- [ ] Build succeeds
- [ ] CHANGELOG.md is updated
- [ ] Version numbers match in:
  - [ ] package.json
  - [ ] src-tauri/Cargo.toml
  - [ ] src-tauri/tauri.conf.json
- [ ] Documentation is up to date
- [ ] License information is correct
- [ ] Dependencies are updated (security patches)

## Automation Suggestions

Consider these automations for the future:

- Release builds with GitHub Actions
- Automatic CHANGELOG generation
- Automatic version synchronization
- Automatic release notes generation
