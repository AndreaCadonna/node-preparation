/**
 * Exercise 2: File Upload Handler
 *
 * Build a secure file upload system with validation and storage.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, 'uploads');

// Task 1: Create upload directory if it doesn't exist

// Task 2: Implement file upload with these features:
// - Validate file type (only allow images: jpg, png, gif)
// - Limit file size (max 5MB)
// - Generate unique filenames
// - Save metadata (original name, size, upload time)

// Task 3: Create endpoints:
// POST /upload - Upload file
// GET /files - List uploaded files
// GET /files/:id - Download specific file
// DELETE /files/:id - Delete file

const server = http.createServer(async (req, res) => {
  // TODO: Implement file upload system
});

server.listen(3000, () => {
  console.log('File upload server running at http://localhost:3000/');
});
