# Performance Optimization

## 1. Response Compression

Reduce bandwidth by compressing responses:

```javascript
const zlib = require('zlib');

if (acceptsGzip) {
  res.setHeader('Content-Encoding', 'gzip');
  zlib.gzip(data, (err, compressed) => {
    res.end(compressed);
  });
}
```

## 2. Connection Keep-Alive

Reuse TCP connections:

```javascript
server.keepAliveTimeout = 5000;
server.headersTimeout = 6000;
```

## 3. HTTP/2

Better performance than HTTP/1.1:
- Multiplexing
- Server Push
- Header Compression

## 4. Caching

Use ETags and Cache-Control headers to reduce repeated requests.

## 5. Clustering

Use all CPU cores:

```javascript
const cluster = require('cluster');
if (cluster.isMaster) {
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
}
```
