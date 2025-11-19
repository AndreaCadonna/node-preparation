/**
 * Exercise 4: HTTP/2 Server with Server Push
 * Build HTTP/2 server with intelligent server push
 */

const http2 = require('http2');
const fs = require('fs');

// Task: Create HTTP/2 server that:
// 1. Serves HTML pages
// 2. Automatically pushes linked resources (CSS, JS)
// 3. Tracks what client already has (avoid duplicate pushes)
// 4. Implements priority hints
// 5. Falls back to HTTP/1.1 if needed

// TODO: Implement HTTP/2 server
