/**
 * Exercise 5 Solution: Simple Static File Server
 *
 * This solution demonstrates:
 * - Serving static files from a directory
 * - MIME type detection based on file extensions
 * - Security: preventing directory traversal attacks
 * - Streaming files efficiently
 * - Handling file system errors (404, permission denied)
 * - Creating sample files programmatically
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

console.log('=== Exercise 5: Static File Server ===\n');

// Public directory path
const PUBLIC_DIR = path.join(__dirname, 'public');

// Task 1: Create a MIME type mapping
/**
 * Create an object that maps file extensions to MIME types
 * Include at least: .html, .css, .js, .json, .txt, .png, .jpg
 *
 * MIME types tell the browser how to interpret the file
 * Format: type/subtype
 *
 * Common MIME types:
 * - text/html: HTML documents
 * - text/css: CSS stylesheets
 * - application/javascript: JavaScript files
 * - application/json: JSON data
 * - image/png, image/jpeg: images
 */
const mimeTypes = {
  '.html': 'text/html',
  '.htm': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
  '.pdf': 'application/pdf',

  // Images
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',

  // Fonts
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',

  // Audio/Video
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',

  // Archives
  '.zip': 'application/zip',
  '.tar': 'application/x-tar',
  '.gz': 'application/gzip'
};

// Task 2: Create helper function to get MIME type
/**
 * Get MIME type for a file based on its extension
 * @param {string} filePath - Path to file
 * @returns {string} MIME type
 *
 * Approach:
 * - Extract file extension using path.extname()
 * - Look up extension in mimeTypes object
 * - Return default 'application/octet-stream' if unknown
 *   (octet-stream means "binary file, download it")
 */
function getMimeType(filePath) {
  // Get file extension (includes the dot, e.g., '.html')
  const ext = path.extname(filePath).toLowerCase();

  // Look up MIME type, default to binary stream
  return mimeTypes[ext] || 'application/octet-stream';
}

// Task 3: Create helper function to serve files
/**
 * Serve a file to the response
 * @param {string} filePath - Path to file
 * @param {ServerResponse} res - Response object
 *
 * Approach:
 * - Check if file exists using fs.stat()
 * - Get MIME type based on extension
 * - Stream file to response using fs.createReadStream()
 * - Streaming is efficient for large files (doesn't load entire file into memory)
 * - Handle errors (file not found, permission denied, etc.)
 */
function serveFile(filePath, res) {
  // Check if file exists and get stats
  fs.stat(filePath, (err, stats) => {
    // Handle errors
    if (err) {
      if (err.code === 'ENOENT') {
        // File not found
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/html');
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>404 Not Found</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 50px; }
              h1 { color: #e74c3c; }
              code { background: #f4f4f4; padding: 2px 5px; }
            </style>
          </head>
          <body>
            <h1>404 - File Not Found</h1>
            <p>The requested file <code>${path.basename(filePath)}</code> could not be found.</p>
            <p><a href="/">← Back to home</a></p>
          </body>
          </html>
        `);
      } else if (err.code === 'EACCES') {
        // Permission denied
        res.statusCode = 403;
        res.setHeader('Content-Type', 'text/plain');
        res.end('403 Forbidden: Permission denied');
      } else {
        // Other errors
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain');
        res.end('500 Internal Server Error');
      }
      return;
    }

    // Check if it's a file (not a directory)
    if (!stats.isFile()) {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'text/plain');
      res.end('403 Forbidden: Not a file');
      return;
    }

    // Get MIME type
    const mimeType = getMimeType(filePath);

    // Set headers
    res.statusCode = 200;
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stats.size);

    // Optional: Add caching headers
    // Cache static files for 1 hour
    res.setHeader('Cache-Control', 'public, max-age=3600');

    // Set Last-Modified header
    res.setHeader('Last-Modified', stats.mtime.toUTCString());

    // Create read stream and pipe to response
    // Streaming is memory-efficient - reads file in chunks
    const fileStream = fs.createReadStream(filePath);

    // Handle stream errors
    fileStream.on('error', (error) => {
      console.error('Error reading file:', error);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain');
        res.end('500 Internal Server Error');
      }
    });

    // Pipe file stream to response
    // This automatically handles backpressure and chunking
    fileStream.pipe(res);

    // Log successful file serve
    console.log(`✓ Served: ${path.basename(filePath)} (${stats.size} bytes, ${mimeType})`);
  });
}

// Task 4: Create the server
const server = http.createServer((req, res) => {
  // Only handle GET requests
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Allow', 'GET');
    res.end('405 Method Not Allowed');
    return;
  }

  // Parse URL (remove query string if present)
  let requestPath = req.url.split('?')[0];

  // Decode URI components (handle spaces and special characters)
  requestPath = decodeURIComponent(requestPath);

  // Default to index.html for root path
  if (requestPath === '/') {
    requestPath = '/index.html';
  }

  // Security: Prevent directory traversal attacks
  // Resolve the full path and ensure it's within PUBLIC_DIR
  const filePath = path.resolve(PUBLIC_DIR, requestPath.substring(1));

  // Check if the resolved path is still within PUBLIC_DIR
  // This prevents attacks like: GET /../../../etc/passwd
  if (!filePath.startsWith(PUBLIC_DIR)) {
    console.log(`✗ Blocked directory traversal attempt: ${requestPath}`);
    res.statusCode = 403;
    res.setHeader('Content-Type', 'text/plain');
    res.end('403 Forbidden: Access denied');
    return;
  }

  // Log request
  console.log(`${new Date().toISOString()} - GET ${requestPath}`);

  // Serve the file
  serveFile(filePath, res);
});

// Task 5: Create sample files
/**
 * Before starting the server, create a public directory with:
 * - index.html
 * - style.css
 * - script.js
 * - about.html
 *
 * Approach:
 * - Create public directory if it doesn't exist
 * - Write sample HTML, CSS, and JS files
 * - These files will be served by the server
 */
function createSampleFiles() {
  console.log('Creating sample files...\n');

  // Create public directory if it doesn't exist
  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
    console.log('✓ Created directory:', PUBLIC_DIR);
  }

  // Sample index.html
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Static File Server</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>🚀 Node.js Static File Server</h1>
      <p class="subtitle">Exercise 5: Level 1 Basics</p>
    </header>

    <main>
      <section class="intro">
        <h2>Welcome!</h2>
        <p>This page is being served by a custom Node.js HTTP server.</p>
        <p>The server demonstrates:</p>
        <ul>
          <li>Serving HTML, CSS, and JavaScript files</li>
          <li>MIME type detection</li>
          <li>Security (directory traversal prevention)</li>
          <li>Efficient file streaming</li>
        </ul>
      </section>

      <section class="features">
        <h2>Features</h2>
        <div class="feature-grid">
          <div class="feature">
            <h3>📄 HTML</h3>
            <p>Serving HTML pages</p>
          </div>
          <div class="feature">
            <h3>🎨 CSS</h3>
            <p>Styling with CSS</p>
          </div>
          <div class="feature">
            <h3>⚡ JavaScript</h3>
            <p>Interactive with JS</p>
          </div>
          <div class="feature">
            <h3>🔒 Security</h3>
            <p>Directory traversal protection</p>
          </div>
        </div>
      </section>

      <section class="links">
        <h2>Navigation</h2>
        <nav>
          <a href="/" class="btn">Home</a>
          <a href="/about.html" class="btn">About</a>
        </nav>
      </section>

      <section class="demo">
        <h2>JavaScript Demo</h2>
        <button id="demoBtn">Click Me!</button>
        <p id="demoText"></p>
      </section>
    </main>

    <footer>
      <p>Built with Node.js HTTP module | Exercise 5 Solution</p>
    </footer>
  </div>

  <script src="/script.js"></script>
</body>
</html>`;

  // Sample style.css
  const styleCss = `/* Static File Server Styles */

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  line-height: 1.6;
  color: #333;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  padding: 20px;
}

.container {
  max-width: 900px;
  margin: 0 auto;
  background: white;
  border-radius: 10px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 40px 20px;
  text-align: center;
}

header h1 {
  font-size: 2.5em;
  margin-bottom: 10px;
}

.subtitle {
  font-size: 1.1em;
  opacity: 0.9;
}

main {
  padding: 40px 20px;
}

section {
  margin-bottom: 40px;
}

h2 {
  color: #667eea;
  margin-bottom: 20px;
  font-size: 1.8em;
}

h3 {
  margin-bottom: 10px;
  color: #764ba2;
}

ul {
  margin-left: 20px;
  margin-top: 10px;
}

li {
  margin: 8px 0;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.feature {
  padding: 20px;
  border: 2px solid #667eea;
  border-radius: 8px;
  text-align: center;
  transition: transform 0.3s, box-shadow 0.3s;
}

.feature:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
}

nav {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.btn {
  display: inline-block;
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-decoration: none;
  border-radius: 5px;
  transition: transform 0.3s, box-shadow 0.3s;
  font-weight: 500;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

.demo {
  text-align: center;
}

#demoBtn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 15px 30px;
  font-size: 1.1em;
  border-radius: 5px;
  cursor: pointer;
  transition: transform 0.3s, box-shadow 0.3s;
  font-weight: 500;
}

#demoBtn:hover {
  transform: scale(1.05);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

#demoText {
  margin-top: 20px;
  font-size: 1.2em;
  color: #667eea;
  font-weight: 500;
  min-height: 30px;
}

footer {
  background: #f8f9fa;
  padding: 20px;
  text-align: center;
  color: #666;
  border-top: 1px solid #dee2e6;
}

@media (max-width: 768px) {
  header h1 {
    font-size: 2em;
  }

  .feature-grid {
    grid-template-columns: 1fr;
  }
}`;

  // Sample script.js
  const scriptJs = `// Static File Server - JavaScript Demo

console.log('✓ JavaScript file loaded successfully!');
console.log('This file was served by our custom Node.js HTTP server');

// Demo button functionality
document.addEventListener('DOMContentLoaded', function() {
  const btn = document.getElementById('demoBtn');
  const text = document.getElementById('demoText');
  let clickCount = 0;

  const messages = [
    '🎉 JavaScript is working!',
    '✨ Files are being served correctly!',
    '🚀 This is a custom HTTP server!',
    '💡 MIME types are detected automatically!',
    '🔒 Directory traversal is prevented!',
    '⚡ Files are streamed efficiently!',
    '🎨 CSS is loaded and styled!',
    '📄 Multiple file types supported!'
  ];

  btn.addEventListener('click', function() {
    clickCount++;
    const message = messages[clickCount % messages.length];
    text.textContent = message;

    // Add animation
    text.style.opacity = '0';
    setTimeout(() => {
      text.style.opacity = '1';
    }, 100);
  });

  // Log page load
  console.log('Page loaded at:', new Date().toLocaleString());
  console.log('Current URL:', window.location.href);
});

// Demonstrate fetch API (can be used to test the server)
function testStaticServer() {
  fetch('/style.css')
    .then(response => {
      console.log('✓ Fetched style.css:', response.status, response.headers.get('Content-Type'));
    })
    .catch(error => {
      console.error('✗ Error fetching style.css:', error);
    });
}

// Run test
testStaticServer();`;

  // Sample about.html
  const aboutHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>About - Static File Server</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>📚 About This Server</h1>
      <p class="subtitle">Exercise 5: Static File Server</p>
    </header>

    <main>
      <section>
        <h2>What is This?</h2>
        <p>This is a custom static file server built with Node.js HTTP module.</p>
        <p>It demonstrates fundamental concepts of web servers:</p>
        <ul>
          <li>HTTP request handling</li>
          <li>File system operations</li>
          <li>MIME type detection</li>
          <li>Security best practices</li>
          <li>Efficient file streaming</li>
        </ul>
      </section>

      <section>
        <h2>Technical Details</h2>
        <h3>Modules Used:</h3>
        <ul>
          <li><strong>http</strong> - Core HTTP server functionality</li>
          <li><strong>fs</strong> - File system operations</li>
          <li><strong>path</strong> - Path manipulation and security</li>
        </ul>

        <h3>Security Features:</h3>
        <ul>
          <li>Directory traversal prevention</li>
          <li>Path validation and sanitization</li>
          <li>Method restriction (GET only)</li>
          <li>Proper error handling</li>
        </ul>
      </section>

      <section class="links">
        <h2>Navigation</h2>
        <nav>
          <a href="/" class="btn">← Back to Home</a>
        </nav>
      </section>
    </main>

    <footer>
      <p>Built with Node.js HTTP module | Exercise 5 Solution</p>
    </footer>
  </div>
</body>
</html>`;

  // Write files
  const files = [
    { name: 'index.html', content: indexHtml },
    { name: 'style.css', content: styleCss },
    { name: 'script.js', content: scriptJs },
    { name: 'about.html', content: aboutHtml }
  ];

  files.forEach(file => {
    const filePath = path.join(PUBLIC_DIR, file.name);
    fs.writeFileSync(filePath, file.content);
    console.log(`✓ Created: ${file.name}`);
  });

  console.log('\n✓ All sample files created successfully!\n');
}

// Initialize - create sample files if they don't exist
if (!fs.existsSync(path.join(PUBLIC_DIR, 'index.html'))) {
  createSampleFiles();
} else {
  console.log('✓ Sample files already exist\n');
}

const PORT = 3000;

server.listen(PORT, () => {
  console.log(`✓ Static file server running at http://localhost:${PORT}/\n`);
  console.log('Serving files from:', PUBLIC_DIR);
  console.log('');
  console.log('Try these URLs in your browser:');
  console.log(`  http://localhost:${PORT}/`);
  console.log(`  http://localhost:${PORT}/about.html`);
  console.log(`  http://localhost:${PORT}/style.css`);
  console.log(`  http://localhost:${PORT}/script.js`);
  console.log('');
  console.log('Or with curl:');
  console.log(`  curl http://localhost:${PORT}/`);
  console.log(`  curl http://localhost:${PORT}/style.css`);
  console.log('\nPress Ctrl+C to stop\n');
});

// Error handling
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`✗ Error: Port ${PORT} is already in use`);
    process.exit(1);
  } else {
    console.error('✗ Server error:', error.message);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down gracefully...');
  server.close(() => {
    console.log('✓ Server closed');
    process.exit(0);
  });
});

/**
 * Testing:
 * 1. Run: node exercise-5-solution.js
 * 2. Visit http://localhost:3000/ in browser
 * 3. Try accessing different files:
 *    - http://localhost:3000/
 *    - http://localhost:3000/about.html
 *    - http://localhost:3000/style.css
 *    - http://localhost:3000/script.js
 * 4. Try accessing non-existent file (should get 404)
 * 5. Try directory traversal (should be blocked)
 *
 * With curl:
 *    curl http://localhost:3000/
 *    curl http://localhost:3000/style.css
 *    curl http://localhost:3000/nonexistent.html
 *    curl "http://localhost:3000/../../../etc/passwd"
 */

/**
 * KEY LEARNING POINTS:
 *
 * 1. MIME Types:
 *    - Tell the browser how to interpret files
 *    - text/html for HTML, text/css for CSS, etc.
 *    - Critical for browser to render correctly
 *    - Default to application/octet-stream for unknown types
 *
 * 2. File Streaming:
 *    - fs.createReadStream() reads file in chunks
 *    - More memory-efficient than fs.readFile()
 *    - Use .pipe() to stream directly to response
 *    - Automatically handles backpressure
 *
 * 3. Security - Directory Traversal:
 *    - Attackers try: /../../../etc/passwd
 *    - Use path.resolve() to get absolute path
 *    - Check path starts with PUBLIC_DIR
 *    - Never trust user input in file paths
 *
 * 4. File System Operations:
 *    - fs.stat() gets file info (size, type, modified time)
 *    - Check stats.isFile() vs stats.isDirectory()
 *    - Handle errors: ENOENT (not found), EACCES (permission)
 *
 * 5. HTTP Headers:
 *    - Content-Type: tells client what type of file
 *    - Content-Length: tells client file size
 *    - Cache-Control: caching instructions
 *    - Last-Modified: when file was last changed
 *
 * 6. Path Manipulation:
 *    - path.join() combines path segments safely
 *    - path.resolve() creates absolute paths
 *    - path.extname() gets file extension
 *    - path.basename() gets filename
 *
 * 7. Default Files:
 *    - Serve index.html for root path /
 *    - Common convention for web servers
 *    - Users expect / to show index.html
 */

/**
 * COMMON MISTAKES TO AVOID:
 *
 * ❌ Not validating file paths (security risk):
 *    const filePath = PUBLIC_DIR + req.url; // Dangerous!
 *
 * ❌ Reading entire file into memory:
 *    const data = fs.readFileSync(filePath); // Bad for large files
 *
 * ❌ Not setting MIME type:
 *    // Browser may not render CSS/JS correctly
 *
 * ❌ Not handling file errors:
 *    fs.createReadStream(filePath).pipe(res); // No error handling!
 *
 * ❌ Serving directories instead of files:
 *    // Should check stats.isFile()
 *
 * ❌ Not decoding URI components:
 *    // Files with spaces won't work
 *
 * ❌ Trusting user input:
 *    // Always validate and sanitize paths
 */

/**
 * GOING FURTHER:
 *
 * Try these challenges:
 * 1. Add directory listing for folders
 * 2. Implement ETag headers for caching
 * 3. Add support for range requests (partial content)
 * 4. Implement gzip compression
 * 5. Add virtual hosts support
 * 6. Implement URL rewriting
 * 7. Add access logging
 * 8. Support for index file variants (.htm, .php, etc.)
 * 9. Add basic authentication
 * 10. Implement a file upload endpoint
 * 11. Add support for Server-Sent Events
 * 12. Create a file browser interface
 * 13. Add support for symbolic links
 * 14. Implement conditional requests (If-Modified-Since)
 *
 * Note: For production use, consider:
 * - express.static() middleware
 * - serve-static package
 * - nginx or Apache for static files
 */
