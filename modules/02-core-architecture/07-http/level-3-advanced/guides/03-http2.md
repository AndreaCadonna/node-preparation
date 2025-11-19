# HTTP/2

## Benefits

1. **Multiplexing**: Multiple requests over single connection
2. **Server Push**: Server sends resources before requested
3. **Header Compression**: HPACK compression
4. **Binary Protocol**: More efficient parsing

## Creating HTTP/2 Server

```javascript
const http2 = require('http2');

const server = http2.createSecureServer({
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
});

server.on('stream', (stream, headers) => {
  stream.respond({
    'content-type': 'text/html',
    ':status': 200
  });
  stream.end('<h1>HTTP/2!</h1>');
});
```

## Server Push

```javascript
stream.pushStream({ ':path': '/style.css' }, (err, pushStream) => {
  pushStream.respond({
    'content-type': 'text/css',
    ':status': 200
  });
  pushStream.end('body { color: blue; }');
});
```

## Requirements

- Must use HTTPS
- Client must support HTTP/2
- Falls back to HTTP/1.1 if not supported
