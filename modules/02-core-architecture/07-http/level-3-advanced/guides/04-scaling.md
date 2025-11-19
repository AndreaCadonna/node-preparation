# Scaling Strategies

## 1. Clustering

Use all CPU cores:

```javascript
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
} else {
  // Worker process
  createServer().listen(3000);
}
```

## 2. Load Balancing

- **Round Robin**: Distribute evenly
- **Least Connections**: Send to least busy
- **IP Hash**: Same client to same server

## 3. Reverse Proxy

Use nginx or HAProxy:
- SSL termination
- Load balancing
- Caching
- Compression

## 4. Horizontal Scaling

Add more servers:
- Container orchestration (Kubernetes)
- Auto-scaling
- Service mesh

## 5. Caching

- **CDN**: For static assets
- **Redis**: For session/data
- **HTTP caching**: For responses
