/**
 * Example 2: File Upload Handling
 *
 * Demonstrates:
 * - Handling multipart/form-data
 * - Parsing file uploads
 * - Saving uploaded files
 * - File size limits
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

console.log('=== File Upload Example ===\n');

// Create uploads directory
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
  console.log('Created uploads directory\n');
}

// Parse multipart form data (simple implementation)
function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const boundary = req.headers['content-type']?.split('boundary=')[1];
    if (!boundary) {
      reject(new Error('No boundary found'));
      return;
    }

    let data = Buffer.from([]);

    req.on('data', chunk => {
      data = Buffer.concat([data, chunk]);
    });

    req.on('end', () => {
      const parts = [];
      const boundaryBuffer = Buffer.from(`--${boundary}`);
      let start = 0;

      while (true) {
        const boundaryIndex = data.indexOf(boundaryBuffer, start);
        if (boundaryIndex === -1) break;

        const nextBoundary = data.indexOf(boundaryBuffer, boundaryIndex + boundaryBuffer.length);
        if (nextBoundary === -1) break;

        const part = data.slice(boundaryIndex + boundaryBuffer.length, nextBoundary);
        const headerEnd = part.indexOf('\r\n\r\n');

        if (headerEnd !== -1) {
          const headers = part.slice(0, headerEnd).toString();
          const content = part.slice(headerEnd + 4, part.length - 2);

          const nameMatch = headers.match(/name="([^"]+)"/);
          const filenameMatch = headers.match(/filename="([^"]+)"/);

          if (nameMatch) {
            parts.push({
              name: nameMatch[1],
              filename: filenameMatch ? filenameMatch[1] : null,
              content: content
            });
          }
        }

        start = nextBoundary;
      }

      resolve(parts);
    });

    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.url === '/' && req.method === 'GET') {
    // Serve upload form
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>File Upload</title>
        <style>
          body { font-family: Arial; max-width: 600px; margin: 50px auto; }
          form { border: 1px solid #ccc; padding: 20px; }
          input { margin: 10px 0; }
        </style>
      </head>
      <body>
        <h1>File Upload Example</h1>
        <form action="/upload" method="POST" enctype="multipart/form-data">
          <div>
            <label>Name: <input type="text" name="name" required></label>
          </div>
          <div>
            <label>File: <input type="file" name="file" required></label>
          </div>
          <button type="submit">Upload</button>
        </form>
        <h2>Test with curl:</h2>
        <pre>
curl -X POST http://localhost:3000/upload \\
  -F "name=test" \\
  -F "file=@/path/to/file.txt"
        </pre>
      </body>
      </html>
    `);
  } else if (req.url === '/upload' && req.method === 'POST') {
    try {
      const parts = await parseMultipart(req);

      const files = [];
      const fields = {};

      for (const part of parts) {
        if (part.filename) {
          // It's a file
          const filename = `${Date.now()}-${part.filename}`;
          const filepath = path.join(UPLOAD_DIR, filename);

          fs.writeFileSync(filepath, part.content);

          files.push({
            fieldName: part.name,
            originalName: part.filename,
            savedAs: filename,
            size: part.content.length,
            path: filepath
          });

          console.log(`File uploaded: ${filename} (${part.content.length} bytes)`);
        } else {
          // It's a regular field
          fields[part.name] = part.content.toString();
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        message: 'Upload successful',
        fields: fields,
        files: files
      }, null, 2));

    } catch (error) {
      console.error('Upload error:', error);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Upload failed',
        message: error.message
      }));
    }
  } else if (req.url === '/uploads' && req.method === 'GET') {
    // List uploaded files
    const files = fs.readdirSync(UPLOAD_DIR);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      uploadDirectory: UPLOAD_DIR,
      files: files.map(f => ({
        name: f,
        size: fs.statSync(path.join(UPLOAD_DIR, f)).size
      }))
    }, null, 2));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

const PORT = 3000;

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Upload directory: ${UPLOAD_DIR}\n`);
  console.log('Routes:');
  console.log('  GET  / - Upload form');
  console.log('  POST /upload - Handle upload');
  console.log('  GET  /uploads - List uploaded files\n');
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  }
});

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.close(() => process.exit(0));
});

/**
 * Key Concepts:
 *
 * 1. Multipart form data uses boundaries to separate parts
 * 2. Each part has headers (Content-Disposition, etc.)
 * 3. File data is binary - use Buffer
 * 4. Always validate file types and sizes
 * 5. Generate unique filenames to prevent conflicts
 * 6. Store files outside web root for security
 *
 * Note: For production, use a library like 'formidable' or 'multer'
 */
