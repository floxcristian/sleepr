# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability, please email security@sleepr.com instead of opening a public issue.

Include the following information:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We aim to respond within 48 hours and will keep you updated on the progress.

## Security Measures

- All passwords are hashed using bcrypt with salt rounds of 12+
- JWT tokens are secured with strong secrets
- Database connections use authentication
- Docker containers run as non-root users
- Rate limiting is implemented
- Input validation on all endpoints
- Security headers are configured
