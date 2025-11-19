/**
 * Example 5: HTTP/2 Server
 * 
 * Demonstrates HTTP/2 features including server push
 * Note: Requires HTTPS
 */

const http2 = require('http2');
const fs = require('fs');
const path = require('path');

console.log('=== HTTP/2 Server Example ===\n');

// Note: In production, use real certificates
console.log('Note: This example requires SSL certificates');
console.log('Create self-signed cert: openssl req -x509 -newkey rsa:2048 -nodes -sha256 -subj "/CN=localhost" -keyout key.pem -out cert.pem\n');

const server = http2.createSecureServer({
  key: fs.existsSync('key.pem') ? fs.readFileSync('key.pem') : Buffer.from(''),
  cert: fs.existsSync('cert.pem') ? fs.readFileSync('cert.pem') : Buffer.from('')
});

server.on('error', (err) => console.error(err));

server.on('stream', (stream, headers) => {
  const path = headers[':path'];

  if (path === '/') {
    // Server Push: Proactively send resources
    stream.pushStream({ ':path': '/style.css' }, (err, pushStream) => {
      if (err) return;
      pushStream.respond({
        ':status': 200,
        'content-type': 'text/css'
      });
      pushStream.end('body { font-family: Arial; }');
    });

    stream.respond({
      'content-type': 'text/html',
      ':status': 200
    });
    stream.end('<h1>HTTP/2 Server</h1><p>With Server Push!</p>');
  } else {
    stream.respond({ ':status': 404 });
    stream.end();
  }
});

if (fs.existsSync('key.pem')) {
  server.listen(8443, () => {
    console.log('HTTP/2 server: https://localhost:8443/');
  });
} else {
  console.log('Certificates not found. Please generate them first.');
}
