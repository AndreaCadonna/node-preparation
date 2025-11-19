# Production Deployment

## Checklist

### Security
- [ ] Use HTTPS
- [ ] Set security headers
- [ ] Implement rate limiting
- [ ] Validate all inputs
- [ ] Configure CORS properly
- [ ] Keep dependencies updated

### Performance
- [ ] Enable compression
- [ ] Use HTTP/2
- [ ] Implement caching
- [ ] Use connection pooling
- [ ] Cluster for multi-core

### Reliability
- [ ] Graceful shutdown
- [ ] Health checks
- [ ] Error logging
- [ ] Monitoring/metrics
- [ ] Automatic restarts

### Monitoring
- [ ] Request logging
- [ ] Error tracking (Sentry, etc.)
- [ ] Performance monitoring (New Relic, etc.)
- [ ] Uptime monitoring
- [ ] Alerts for errors/downtime

## Environment Variables

```javascript
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
```

## Process Managers

Use PM2 or similar:

```bash
pm2 start server.js -i max
pm2 startup
pm2 save
```

## Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```
