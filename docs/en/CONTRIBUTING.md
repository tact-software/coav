# Contributing to COAV

**English** | [日本語](./CONTRIBUTING.md)

Thank you for your interest in contributing to the COAV project! This guide explains how to contribute to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)
- [Pull Requests](#pull-requests)
- [Issue Reporting](#issue-reporting)
- [Questions and Support](#questions-and-support)

## Code of Conduct

This project adheres to a [Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Ways to Contribute

There are several ways to contribute to COAV:

### 🐛 Bug Reports

- If you find a bug, first check existing Issues
- If there's no similar report, create a new Issue
- Use the bug report template and provide as much detail as possible

### 💡 Feature Suggestions

- For new feature ideas, we recommend discussing them in Discussions first
- Once consensus is reached, create a feature request Issue

### 📖 Documentation Improvements

- Fix typos
- Improve explanations
- Add new examples
- Improve translations

### 💻 Code Contributions

- Bug fixes
- New feature implementation
- Performance improvements
- Adding tests

## Development Setup

### Prerequisites

- [Git](https://git-scm.com/)
- [Rust](https://www.rust-lang.org/) 1.70 or higher
- [Node.js](https://nodejs.org/) 18 or higher, or [Bun](https://bun.sh/)
- [mise](https://mise.jdx.dev/) (recommended)

### Setup Steps

1. Fork the repository

```bash
# Click the Fork button on GitHub
```

2. Clone your forked repository

```bash
git clone https://github.com/your-username/coav.git
cd coav
```

3. Add upstream remote

```bash
git remote add upstream https://github.com/tact-software/coav.git
```

4. Install dependencies

```bash
# Using mise (recommended)
mise install

# Install dependencies
bun install
```

5. Start development server

```bash
bun tauri:dev
```

## Development Workflow

### 1. Create a Branch

```bash
# Get the latest main branch
git checkout main
git pull upstream main

# Create a feature branch
git checkout -b feature/your-feature-name
```

Branch naming conventions:

- `feature/` - New features
  - Example: `feature/auto-update`, `feature/123-screenshot-tool`
- `fix/` - Bug fixes
  - Example: `fix/memory-leak`, `fix/456-panel-crash`
- `docs/` - Documentation
  - Example: `docs/api-guide`, `docs/readme-update`
- `refactor/` - Refactoring
  - Example: `refactor/component-structure`
- `test/` - Adding tests
  - Example: `test/unit-tests`, `test/e2e-setup`
- `chore/` - Other changes
  - Example: `chore/dependencies-update`
- `hotfix/` - Emergency fixes (from main branch)
  - Example: `hotfix/1.0.1-critical-bug`
- `release/` - Release preparation
  - Example: `release/v1.1.0`

### 2. Development

```bash
# Start development server
bun tauri:dev

# Format code
bun format

# Lint check
bun lint

# Run tests (not yet implemented)
bun test
```

### 3. Commit

```bash
# Stage changes
git add .

# Commit (follow commit message conventions below)
git commit -m "feat: add new feature"
```

### 4. Push and Create PR

```bash
# Push to your forked repository
git push origin feature/your-feature-name
```

Create a pull request on GitHub.

## Coding Standards

### TypeScript/JavaScript

- Follow ESLint and Prettier configurations
- Prioritize type safety, avoid using `any` type
- Add appropriate comments to functions and classes

```typescript
/**
 * Generate color from category ID
 * @param categoryId - Category identifier
 * @returns HSL format color string
 */
export const generateCategoryColor = (categoryId: number): string => {
  const hue = (categoryId * 137.5) % 360;
  return `hsl(${hue}, 50%, 50%)`;
};
```

### Rust

- Format with `cargo fmt`
- Lint check with `cargo clippy`
- Write safe code, minimize use of `unsafe`

```rust
/// Load image from file
///
/// # Arguments
/// * `file_path` - Path to the image file
///
/// # Returns
/// * `Result<Vec<u8>, String>` - Image data or error message
#[tauri::command]
pub fn load_image(file_path: &str) -> Result<Vec<u8>, String> {
    // Implementation
}
```

### CSS

- Use CSS Modules or styled-components
- Follow BEM naming conventions
- Utilize CSS variables for theming

```css
/* Good example */
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

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only changes
- `style`: Changes that don't affect code meaning (whitespace, formatting, etc.)
- `refactor`: Code changes that neither fix bugs nor add features
- `perf`: Performance improvements
- `test`: Adding or modifying tests
- `chore`: Changes to build process or auxiliary tools

### Examples

```
feat(annotation): add category-specific color palette feature

- Implement color settings tab
- Enable customization of colors per category
- Integrate opacity settings

Closes #123
```

```
fix(viewer): fix memory leak with large datasets

Fixed issue where unused Canvas contexts were not being released.
Modified useEffect cleanup function to properly release resources.

Fixes #456
```

## Pull Requests

### Checklist Before Creating PR

- [ ] Code builds successfully (`bun tauri:build`)
- [ ] All tests pass (`bun test`) \*Test infrastructure under development
- [ ] No lint errors (`bun lint`)
- [ ] Code is formatted (`bun format`)
- [ ] Related documentation is updated
- [ ] Tests are added if necessary \*Test infrastructure under development
- [ ] Commit messages follow conventions

### PR Template

```markdown
## Summary

<!-- Explain the summary of this change -->

## Changes

<!-- List specific changes -->

-
-
-

## Related Issues

<!-- Reference related issue numbers -->

Closes #

## Screenshots

<!-- For UI changes, attach before/after screenshots -->

## How to Test

<!-- Explain how to test this change -->

1.
2.
3.

## Checklist

- [ ] Code builds successfully
- [ ] Tests pass
- [ ] No lint errors
- [ ] Documentation updated
```

### Review Process

1. CI runs automatically when PR is created
2. Code review is conducted
3. Make corrections as needed
4. Maintainers merge after approval

## Issue Reporting

### Bug Report Template

```markdown
## Bug Description

<!-- Clearly describe the bug -->

## Steps to Reproduce

1.
2.
3.

## Expected Behavior

<!-- How it should work -->

## Actual Behavior

<!-- What actually happened -->

## Environment

- OS: [e.g., Windows 11, macOS 13.0, Ubuntu 22.04]
- COAV Version: [e.g., 1.0.0]
- Screen Resolution: [e.g., 1920x1080]

## Screenshots

<!-- Attach screenshots if possible -->

## Additional Information

<!-- Any other relevant information -->
```

### Feature Request Template

```markdown
## Feature Description

<!-- Describe the proposed feature -->

## Motivation

<!-- Why is this feature needed -->

## Proposed Solution

<!-- How should it be implemented -->

## Alternatives

<!-- Other methods considered -->

## Additional Information

<!-- Any other relevant information -->
```

## Questions and Support

- **General Questions**: Use [Discussions](https://github.com/tact-software/coav/discussions)
- **Bug Reports**: Create [Issues](https://github.com/tact-software/coav/issues)
- **Security Issues**: Refer to [SECURITY.md](./SECURITY.md)

## License

Your contributed code will be released under the same [MIT License](./LICENSE) as the project.

---

If you have any questions, feel free to ask in Discussions. We look forward to your contributions to the COAV project! 🎉
