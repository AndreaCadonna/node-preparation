# Security Best Practices

## 1. HTTPS

Always use HTTPS in production:
- Encrypts data
- Prevents man-in-the-middle attacks
- Required for modern browser features

## 2. Security Headers

```javascript
res.setHeader('X-Content-Type-Options', 'nosniff');
res.setHeader('X-Frame-Options', 'DENY');
res.setHeader('X-XSS-Protection', '1; mode=block');
res.setHeader('Strict-Transport-Security', 'max-age=31536000');
res.setHeader('Content-Security-Policy', "default-src 'self'");
```

## 3. Input Validation

Always validate and sanitize user input:
- Check data types
- Validate lengths
- Sanitize for SQL injection, XSS

## 4. Rate Limiting

Prevent abuse and DDoS attacks.

## 5. CORS

Configure CORS properly - don't use `*` in production.

## 6. Authentication

- Use HTTPS
- Strong password policies
- Token expiration
- Refresh tokens
