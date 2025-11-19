# HTTPS and Security

## Why HTTPS?

1. **Encryption**: Protects data in transit
2. **Authentication**: Verifies server identity
3. **Integrity**: Prevents tampering
4. **Required**: Many browser features require HTTPS

## SSL/TLS Certificates

### Development

Self-signed certificate:

```bash
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

### Production

Use certificates from trusted CA:
- Let's Encrypt (free, automated)
- DigiCert, GlobalSign (commercial)

## Creating HTTPS Server

```javascript
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};

https.createServer(options, (req, res) => {
  res.end('Secure connection');
}).listen(443);
```

## Security Best Practices

### 1. TLS Configuration

```javascript
{
  minVersion: 'TLSv1.2',
  ciphers: 'ECDHE-RSA-AES128-GCM-SHA256:...'
}
```

### 2. HSTS Header

Force HTTPS:

```javascript
res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
```

### 3. Redirect HTTP to HTTPS

```javascript
http.createServer((req, res) => {
  res.writeHead(301, {
    'Location': 'https://' + req.headers.host + req.url
  });
  res.end();
});
```

### 4. Certificate Renewal

Certificates expire - automate renewal with certbot (Let's Encrypt).

## Common Issues

1. **Self-signed certificate warnings**: Expected in development
2. **Mixed content**: Don't load HTTP resources on HTTPS pages
3. **Certificate expiration**: Monitor and renew
4. **Performance**: TLS handshake overhead (use HTTP/2)
