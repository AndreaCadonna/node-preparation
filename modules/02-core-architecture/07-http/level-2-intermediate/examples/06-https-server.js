/**
 * Example 6: HTTPS Server
 *
 * Demonstrates:
 * - Creating HTTPS server
 * - Self-signed certificates
 * - SSL/TLS configuration
 * - Redirecting HTTP to HTTPS
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('=== HTTPS Server Example ===\n');

const CERT_DIR = path.join(__dirname, 'certs');
const KEY_FILE = path.join(CERT_DIR, 'key.pem');
const CERT_FILE = path.join(CERT_DIR, 'cert.pem');

// Generate self-signed certificate if it doesn't exist
function generateCertificate() {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(KEY_FILE) && fs.existsSync(CERT_FILE)) {
      console.log('Using existing certificates\n');
      resolve();
      return;
    }

    console.log('Generating self-signed certificate...');

    if (!fs.existsSync(CERT_DIR)) {
      fs.mkdirSync(CERT_DIR, { recursive: true });
    }

    const command = `openssl req -x509 -newkey rsa:4096 -keyout ${KEY_FILE} -out ${CERT_FILE} -days 365 -nodes -subj "/CN=localhost"`;

    exec(command, (error) => {
      if (error) {
        console.error('Failed to generate certificate:', error.message);
        console.log('\nPlease install OpenSSL or create certificates manually');
        console.log('For testing, you can also use HTTP instead of HTTPS\n');
        reject(error);
      } else {
        console.log('Certificate generated successfully!\n');
        resolve();
      }
    });
  });
}

// Request handler
function requestHandler(req, res) {
  const isSecure = req.connection.encrypted;

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>HTTPS Example</title>
      <style>
        body {
          font-family: Arial;
          max-width: 800px;
          margin: 50px auto;
          padding: 20px;
        }
        .secure { color: green; background: #e8f5e9; padding: 20px; }
        .insecure { color: red; background: #ffebee; padding: 20px; }
        .info { background: #f0f0f0; padding: 10px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <h1>HTTPS Server Example</h1>

      <div class="${isSecure ? 'secure' : 'insecure'}">
        <h2>Connection Status: ${isSecure ? '🔒 SECURE (HTTPS)' : '🔓 INSECURE (HTTP)'}</h2>
        <p>Protocol: ${isSecure ? 'HTTPS' : 'HTTP'}</p>
      </div>

      <div class="info">
        <h3>Request Information:</h3>
        <ul>
          <li><strong>Method:</strong> ${req.method}</li>
          <li><strong>URL:</strong> ${req.url}</li>
          <li><strong>Protocol:</strong> ${req.httpVersion}</li>
          <li><strong>Host:</strong> ${req.headers.host}</li>
          <li><strong>User-Agent:</strong> ${req.headers['user-agent']}</li>
        </ul>
      </div>

      <div class="info">
        <h3>SSL/TLS Information:</h3>
        ${isSecure ? `
          <p>This connection is encrypted using TLS</p>
          <p>Certificate: Self-signed (for testing only)</p>
        ` : `
          <p>This connection is NOT encrypted</p>
          <p><a href="https://localhost:8443${req.url}">Switch to HTTPS</a></p>
        `}
      </div>

      <h3>Test Links:</h3>
      <ul>
        <li><a href="http://localhost:8080/">HTTP version</a></li>
        <li><a href="https://localhost:8443/">HTTPS version</a></li>
      </ul>
    </body>
    </html>
  `);
}

async function startServers() {
  try {
    await generateCertificate();

    // Only start HTTPS if certificates exist
    if (fs.existsSync(KEY_FILE) && fs.existsSync(CERT_FILE)) {
      // HTTPS Server
      const httpsOptions = {
        key: fs.readFileSync(KEY_FILE),
        cert: fs.readFileSync(CERT_FILE),
        // Additional security options
        minVersion: 'TLSv1.2',
        ciphers: 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384',
      };

      const httpsServer = https.createServer(httpsOptions, requestHandler);

      httpsServer.listen(8443, () => {
        console.log('HTTPS server running at https://localhost:8443/');
        console.log('⚠️  Browser will show security warning (self-signed cert)');
        console.log('   Click "Advanced" and "Proceed to localhost"\n');
      });

      httpsServer.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          console.error('Port 8443 is already in use');
        } else {
          console.error('HTTPS server error:', error);
        }
      });
    }

    // HTTP Server (redirects to HTTPS)
    const httpServer = http.createServer((req, res) => {
      if (req.url === '/api/status') {
        // API endpoint doesn't redirect
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          protocol: 'http',
          suggestion: 'Use HTTPS for secure communication'
        }));
      } else {
        // Redirect to HTTPS
        const httpsUrl = `https://localhost:8443${req.url}`;
        res.writeHead(301, {
          'Location': httpsUrl,
          'Strict-Transport-Security': 'max-age=31536000' // HSTS header
        });
        res.end(`Redirecting to HTTPS: ${httpsUrl}`);
      }
    });

    httpServer.listen(8080, () => {
      console.log('HTTP server running at http://localhost:8080/');
      console.log('  (Redirects to HTTPS)\n');
    });

    httpServer.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error('Port 8080 is already in use');
      } else {
        console.error('HTTP server error:', error);
      }
    });

    console.log('Commands to test:');
    console.log('  curl -k https://localhost:8443/');
    console.log('  curl -v http://localhost:8080/');
    console.log('  curl http://localhost:8080/api/status\n');

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\nShutting down...');
      httpServer.close();
      if (httpsServer) httpsServer.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start servers:', error.message);
    console.log('\nStarting HTTP server only...');

    // Fallback to HTTP only
    const httpServer = http.createServer(requestHandler);
    httpServer.listen(8080, () => {
      console.log('HTTP server running at http://localhost:8080/\n');
    });
  }
}

// Start the servers
startServers();

/**
 * Key Concepts:
 *
 * 1. HTTPS encrypts data in transit
 * 2. Requires SSL/TLS certificate and private key
 * 3. Self-signed certs for development, CA-signed for production
 * 4. Modern browsers require HTTPS for many features
 * 5. HSTS header forces HTTPS usage
 * 6. Redirect HTTP to HTTPS for security
 * 7. Use Let's Encrypt for free production certificates
 * 8. TLS 1.2+ recommended, avoid SSL and TLS 1.0/1.1
 *
 * Production Tips:
 * - Use certificate from trusted CA (Let's Encrypt, DigiCert, etc.)
 * - Enable HTTP/2 for better performance
 * - Configure proper cipher suites
 * - Implement certificate renewal automation
 * - Use reverse proxy (nginx, Apache) for SSL termination
 */
