# Security Policy

**English** | [日本語](./SECURITY.md)

## Supported Versions

We currently support the following versions of COAV with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of COAV seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### How to Report

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please use one of the following methods:

#### Method 1: GitHub Security Advisories (Recommended)

1. Go to the [Security Advisories](https://github.com/tact-software/coav/security/advisories) page
2. Click "Report a vulnerability"
3. Fill in the details and submit

#### Method 2: Private Vulnerability Reporting

Use GitHub's [private vulnerability reporting feature](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability).

### Information to Include

Please include the following information:

- Type of issue (e.g., buffer overflow, XSS, path traversal, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

### What to Expect

- **Initial Response**: Within 48 hours, we will acknowledge receipt of your report
- **Assessment**: We will investigate and assess the vulnerability
- **Resolution Timeline**: We aim to provide a fix within 30 days for critical issues
- **Disclosure**: We will coordinate with you on the disclosure timeline

## Security Best Practices for Contributors

When contributing to COAV, please follow these security best practices:

1. **Never commit secrets**: Do not commit API keys, passwords, or other sensitive information
2. **Use environment variables**: Store sensitive configuration in environment variables
3. **Validate inputs**: Always validate and sanitize user inputs
4. **Keep dependencies updated**: Regularly update dependencies to patch known vulnerabilities
5. **Follow the principle of least privilege**: Use minimum necessary permissions

## Security Features in COAV

COAV implements several security measures:

- **Sandboxed file access**: File system access is restricted through Tauri's security model
- **No network requests**: COAV operates entirely offline, reducing attack surface
- **Input validation**: All file inputs are validated before processing
- **Memory safety**: Rust backend provides memory safety guarantees

## Disclosure Policy

When we receive a security report, we will:

1. Confirm the problem and determine affected versions
2. Audit code to find similar problems
3. Prepare fixes for all supported versions
4. Release the fixes as soon as possible

We will credit reporters who follow responsible disclosure practices in our release notes, unless they prefer to remain anonymous.

## Comments on this Policy

If you have suggestions on how this process could be improved, please submit a pull request or open an issue to discuss.
