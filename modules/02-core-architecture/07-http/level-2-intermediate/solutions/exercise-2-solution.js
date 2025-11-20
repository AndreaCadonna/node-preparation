/**
 * Exercise 2: File Upload Handler - SOLUTION
 *
 * Complete implementation of a secure file upload system with:
 * - Multiple endpoints (upload, list, download, delete)
 * - File type validation
 * - Size limits
 * - Unique filename generation
 * - Metadata storage
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('=== Exercise 2: File Upload Handler - SOLUTION ===\n');

// ============================================================================
// Constants and Configuration
// ============================================================================

const UPLOAD_DIR = path.join(__dirname, 'uploads');
const METADATA_FILE = path.join(UPLOAD_DIR, 'metadata.json');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Task 2: File type validation - only allow images
const ALLOWED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif']
};

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif'];

// ============================================================================
// Task 1: Create Upload Directory
// ============================================================================

/**
 * Initialize the upload directory and metadata storage
 *
 * This demonstrates:
 * - File system operations (checking existence, creating directories)
 * - Synchronous vs asynchronous operations (using fs.promises)
 * - Error handling for I/O operations
 */
async function initializeStorage() {
  try {
    // Check if upload directory exists
    try {
      await fs.promises.access(UPLOAD_DIR);
      console.log('✓ Upload directory exists:', UPLOAD_DIR);
    } catch {
      // Directory doesn't exist, create it
      await fs.promises.mkdir(UPLOAD_DIR, { recursive: true });
      console.log('✓ Created upload directory:', UPLOAD_DIR);
    }

    // Initialize metadata file if it doesn't exist
    try {
      await fs.promises.access(METADATA_FILE);
      console.log('✓ Metadata file exists');
    } catch {
      // Create empty metadata file
      await fs.promises.writeFile(METADATA_FILE, JSON.stringify({}, null, 2));
      console.log('✓ Created metadata file');
    }

    return true;
  } catch (error) {
    console.error('✗ Storage initialization failed:', error.message);
    throw error;
  }
}

// ============================================================================
// Metadata Management
// ============================================================================

/**
 * Load file metadata from JSON storage
 */
async function loadMetadata() {
  try {
    const data = await fs.promises.readFile(METADATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading metadata:', error.message);
    return {};
  }
}

/**
 * Save file metadata to JSON storage
 */
async function saveMetadata(metadata) {
  try {
    await fs.promises.writeFile(
      METADATA_FILE,
      JSON.stringify(metadata, null, 2)
    );
    return true;
  } catch (error) {
    console.error('Error saving metadata:', error.message);
    return false;
  }
}

/**
 * Add file metadata entry
 * Task 2: Save metadata (original name, size, upload time)
 */
async function addFileMetadata(fileId, originalName, size, mimeType) {
  const metadata = await loadMetadata();

  metadata[fileId] = {
    id: fileId,
    originalName: originalName,
    size: size,
    mimeType: mimeType,
    uploadTime: new Date().toISOString(),
    downloads: 0
  };

  await saveMetadata(metadata);
  return metadata[fileId];
}

/**
 * Get file metadata by ID
 */
async function getFileMetadata(fileId) {
  const metadata = await loadMetadata();
  return metadata[fileId] || null;
}

/**
 * Delete file metadata entry
 */
async function deleteFileMetadata(fileId) {
  const metadata = await loadMetadata();
  delete metadata[fileId];
  await saveMetadata(metadata);
}

/**
 * Increment download counter
 */
async function incrementDownloads(fileId) {
  const metadata = await loadMetadata();
  if (metadata[fileId]) {
    metadata[fileId].downloads = (metadata[fileId].downloads || 0) + 1;
    await saveMetadata(metadata);
  }
}

// ============================================================================
// Task 2: File Upload Implementation
// ============================================================================

/**
 * Generate unique filename using crypto
 *
 * Format: {timestamp}-{random}.{extension}
 * Example: 1700000000000-a3f8c9d2e1.jpg
 */
function generateUniqueFilename(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const timestamp = Date.now();
  const randomStr = crypto.randomBytes(8).toString('hex');
  return `${timestamp}-${randomStr}${ext}`;
}

/**
 * Validate file type based on extension
 */
function validateFileType(filename, contentType) {
  const ext = path.extname(filename).toLowerCase();

  // Check extension
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(
      `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
    );
  }

  // Check MIME type if provided
  if (contentType && !ALLOWED_TYPES[contentType]) {
    throw new Error(
      `Invalid content type. Allowed: ${Object.keys(ALLOWED_TYPES).join(', ')}`
    );
  }

  return true;
}

/**
 * Parse multipart form data for file upload
 *
 * This is a simplified parser. Production apps should use
 * libraries like 'busboy', 'formidable', or 'multer'.
 */
function parseMultipartUpload(req) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=(.+)/);

    if (!boundaryMatch) {
      return reject(new Error('No boundary found in Content-Type'));
    }

    const boundary = '--' + boundaryMatch[1].trim();
    const chunks = [];
    let size = 0;

    req.on('data', (chunk) => {
      size += chunk.length;

      // Task 2: Limit file size
      if (size > MAX_FILE_SIZE) {
        req.destroy();
        return reject(new Error(`File too large. Max size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`));
      }

      chunks.push(chunk);
    });

    req.on('error', (err) => reject(err));

    req.on('end', () => {
      try {
        const buffer = Buffer.concat(chunks);
        const body = buffer.toString('binary');

        // Split by boundary
        const parts = body.split(boundary);

        for (const part of parts) {
          if (!part.trim() || part.trim() === '--') continue;

          // Extract headers and content
          const [headerSection, ...contentParts] = part.split('\r\n\r\n');
          if (!headerSection) continue;

          // Check if this part contains a file
          const filenameMatch = headerSection.match(/filename="([^"]+)"/);
          const nameMatch = headerSection.match(/name="([^"]+)"/);
          const contentTypeMatch = headerSection.match(/Content-Type:\s*(.+)/i);

          if (filenameMatch && nameMatch[1] === 'file') {
            const filename = filenameMatch[1];
            const contentType = contentTypeMatch ? contentTypeMatch[1].trim() : null;

            // Extract file content (remove trailing boundary markers)
            let content = contentParts.join('\r\n\r\n');
            content = content.substring(0, content.lastIndexOf('\r\n'));

            // Convert from binary string to buffer
            const fileBuffer = Buffer.from(content, 'binary');

            return resolve({
              filename,
              contentType,
              buffer: fileBuffer,
              size: fileBuffer.length
            });
          }
        }

        reject(new Error('No file found in upload'));
      } catch (error) {
        reject(error);
      }
    });
  });
}

// ============================================================================
// Task 3: HTTP Endpoints
// ============================================================================

/**
 * POST /upload - Upload file endpoint
 */
async function handleUpload(req, res) {
  try {
    // Parse multipart upload
    const upload = await parseMultipartUpload(req);

    // Task 2: Validate file type
    validateFileType(upload.filename, upload.contentType);

    // Task 2: Generate unique filename
    const uniqueFilename = generateUniqueFilename(upload.filename);
    const fileId = path.parse(uniqueFilename).name; // Use filename without extension as ID
    const filePath = path.join(UPLOAD_DIR, uniqueFilename);

    // Save file to disk
    await fs.promises.writeFile(filePath, upload.buffer);

    // Task 2: Save metadata
    const metadata = await addFileMetadata(
      fileId,
      upload.filename,
      upload.size,
      upload.contentType
    );

    console.log(`✓ File uploaded: ${upload.filename} -> ${uniqueFilename}`);

    // Send success response
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      message: 'File uploaded successfully',
      file: metadata
    }, null, 2));

  } catch (error) {
    console.error('Upload error:', error.message);

    let statusCode = 400;
    if (error.message.includes('too large')) {
      statusCode = 413;
    }

    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      error: error.message
    }));
  }
}

/**
 * GET /files - List uploaded files endpoint
 */
async function handleListFiles(req, res) {
  try {
    const metadata = await loadMetadata();
    const files = Object.values(metadata);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      count: files.length,
      files: files
    }, null, 2));

  } catch (error) {
    console.error('List error:', error.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      error: 'Failed to list files'
    }));
  }
}

/**
 * GET /files/:id - Download specific file endpoint
 */
async function handleDownload(fileId, req, res) {
  try {
    const metadata = await getFileMetadata(fileId);

    if (!metadata) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'File not found'
      }));
      return;
    }

    // Find the actual file on disk
    const files = await fs.promises.readdir(UPLOAD_DIR);
    const actualFile = files.find(f => f.startsWith(fileId));

    if (!actualFile) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'File not found on disk'
      }));
      return;
    }

    const filePath = path.join(UPLOAD_DIR, actualFile);

    // Increment download counter
    await incrementDownloads(fileId);

    // Stream file to response
    res.writeHead(200, {
      'Content-Type': metadata.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${metadata.originalName}"`,
      'Content-Length': metadata.size
    });

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    console.log(`✓ File downloaded: ${metadata.originalName}`);

  } catch (error) {
    console.error('Download error:', error.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      error: 'Failed to download file'
    }));
  }
}

/**
 * DELETE /files/:id - Delete file endpoint
 */
async function handleDelete(fileId, req, res) {
  try {
    const metadata = await getFileMetadata(fileId);

    if (!metadata) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'File not found'
      }));
      return;
    }

    // Find and delete the actual file
    const files = await fs.promises.readdir(UPLOAD_DIR);
    const actualFile = files.find(f => f.startsWith(fileId));

    if (actualFile) {
      const filePath = path.join(UPLOAD_DIR, actualFile);
      await fs.promises.unlink(filePath);
    }

    // Delete metadata
    await deleteFileMetadata(fileId);

    console.log(`✓ File deleted: ${metadata.originalName}`);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      message: 'File deleted successfully'
    }));

  } catch (error) {
    console.error('Delete error:', error.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      error: 'Failed to delete file'
    }));
  }
}

/**
 * GET / - Landing page with instructions
 */
function handleRoot(req, res) {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>File Upload System</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 900px; margin: 50px auto; padding: 20px; }
        h1 { color: #333; }
        .endpoint { background: #f4f4f4; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .method { display: inline-block; padding: 3px 8px; border-radius: 3px; font-weight: bold; color: white; margin-right: 10px; }
        .post { background: #49cc90; }
        .get { background: #61affe; }
        .delete { background: #f93e3e; }
        code { background: #e0e0e0; padding: 2px 5px; border-radius: 3px; }
        pre { background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 5px; overflow-x: auto; }
        .info { background: #e7f3ff; padding: 10px; border-left: 4px solid #2196F3; margin: 10px 0; }
      </style>
    </head>
    <body>
      <h1>File Upload System</h1>

      <div class="info">
        <strong>Supported file types:</strong> JPG, PNG, GIF<br>
        <strong>Maximum file size:</strong> 5MB
      </div>

      <h2>API Endpoints</h2>

      <div class="endpoint">
        <span class="method post">POST</span>
        <strong>/upload</strong> - Upload a file
        <pre>curl -X POST http://localhost:3000/upload \\
  -F "file=@image.jpg"</pre>
      </div>

      <div class="endpoint">
        <span class="method get">GET</span>
        <strong>/files</strong> - List all files
        <pre>curl http://localhost:3000/files</pre>
      </div>

      <div class="endpoint">
        <span class="method get">GET</span>
        <strong>/files/:id</strong> - Download a file
        <pre>curl http://localhost:3000/files/{fileId} -O</pre>
      </div>

      <div class="endpoint">
        <span class="method delete">DELETE</span>
        <strong>/files/:id</strong> - Delete a file
        <pre>curl -X DELETE http://localhost:3000/files/{fileId}</pre>
      </div>

      <h2>Upload Form</h2>
      <form action="/upload" method="POST" enctype="multipart/form-data">
        <input type="file" name="file" accept="image/*" required>
        <button type="submit">Upload</button>
      </form>
    </body>
    </html>
  `);
}

// ============================================================================
// Main Request Router
// ============================================================================

const server = http.createServer(async (req, res) => {
  const { method, url } = req;

  console.log(`${method} ${url}`);

  // Enable CORS for cross-origin requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Route requests
  if (method === 'POST' && url === '/upload') {
    await handleUpload(req, res);

  } else if (method === 'GET' && url === '/files') {
    await handleListFiles(req, res);

  } else if (method === 'GET' && url.startsWith('/files/')) {
    const fileId = url.split('/')[2];
    await handleDownload(fileId, req, res);

  } else if (method === 'DELETE' && url.startsWith('/files/')) {
    const fileId = url.split('/')[2];
    await handleDelete(fileId, req, res);

  } else if (method === 'GET' && url === '/') {
    handleRoot(req, res);

  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      error: 'Not Found'
    }));
  }
});

// ============================================================================
// Server Startup
// ============================================================================

const PORT = 3000;

async function startServer() {
  try {
    // Task 1: Initialize storage
    await initializeStorage();

    server.listen(PORT, () => {
      console.log(`\n${'='.repeat(60)}`);
      console.log('File Upload Server Running');
      console.log(`${'='.repeat(60)}`);
      console.log(`\nServer URL: http://localhost:${PORT}/`);
      console.log(`\nEndpoints:`);
      console.log(`  POST   /upload       - Upload file`);
      console.log(`  GET    /files        - List files`);
      console.log(`  GET    /files/:id    - Download file`);
      console.log(`  DELETE /files/:id    - Delete file`);
      console.log(`\nUpload Directory: ${UPLOAD_DIR}`);
      console.log(`Max File Size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
      console.log(`Allowed Types: ${ALLOWED_EXTENSIONS.join(', ')}`);
      console.log(`\n${'='.repeat(60)}\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

// Start the server
startServer();

// ============================================================================
// Educational Notes
// ============================================================================

console.log('Implementation Highlights:');
console.log('✓ Secure file upload with type validation');
console.log('✓ Size limits (5MB max)');
console.log('✓ Unique filename generation using crypto');
console.log('✓ Metadata storage (JSON file)');
console.log('✓ Complete CRUD operations (Create, Read, List, Delete)');
console.log('✓ Stream-based file downloads');
console.log('✓ Multipart form data parsing');
console.log('✓ CORS support for cross-origin requests');
console.log('');
