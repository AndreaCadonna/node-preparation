/**
 * Example 2: HTTP Caching
 *
 * Demonstrates:
 * - Cache-Control headers
 * - ETags for conditional requests
 * - Last-Modified headers
 * - 304 Not Modified responses
 */

const http = require('http');
const crypto = require('crypto');

console.log('=== HTTP Caching Example ===\n');

// Simulated data store with timestamps
const dataStore = {
  users: {
    data: [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' }
    ],
    lastModified: new Date(),
    etag: null
  }
};

// Generate ETag for content
function generateETag(content) {
  return crypto
    .createHash('md5')
    .update(JSON.stringify(content))
    .digest('hex');
}

// Update ETag when data changes
function updateData(key, data) {
  dataStore[key].data = data;
  dataStore[key].lastModified = new Date();
  dataStore[key].etag = generateETag(data);
}

// Initialize ETags
updateData('users', dataStore.users.data);

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>HTTP Caching Demo</title>
        <style>
          body { font-family: Arial; max-width: 800px; margin: 50px auto; }
          pre { background: #f0f0f0; padding: 10px; }
          .cache { background: #e8f5e9; padding: 10px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <h1>HTTP Caching Examples</h1>

        <h2>1. Cache-Control</h2>
        <ul>
          <li><a href="/static">Static content (max-age=3600)</a></li>
          <li><a href="/dynamic">Dynamic content (no-cache)</a></li>
          <li><a href="/private">Private content (private, max-age=300)</a></li>
        </ul>

        <h2>2. Conditional Requests (ETag)</h2>
        <ul>
          <li><a href="/users">Users with ETag</a></li>
          <li><a href="/update-users">Update users</a> (changes ETag)</li>
        </ul>

        <h2>3. Last-Modified</h2>
        <ul>
          <li><a href="/data">Data with Last-Modified</a></li>
        </ul>

        <div class="cache">
          <h3>Testing with curl:</h3>
          <pre>
# First request (full response)
curl -i http://localhost:3000/users

# Second request with ETag (304 Not Modified)
curl -i -H "If-None-Match: [etag-from-first-request]" http://localhost:3000/users

# Request with If-Modified-Since
curl -i -H "If-Modified-Since: [date]" http://localhost:3000/data
          </pre>
        </div>
      </body>
      </html>
    `);

  } else if (pathname === '/static') {
    // Static content - cache for 1 hour
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
      'Expires': new Date(Date.now() + 3600000).toUTCString()
    });
    res.end(JSON.stringify({
      message: 'This is static content',
      cacheable: true,
      maxAge: 3600
    }));

  } else if (pathname === '/dynamic') {
    // Dynamic content - always revalidate
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, must-revalidate',
      'Pragma': 'no-cache'
    });
    res.end(JSON.stringify({
      message: 'This is dynamic content',
      timestamp: new Date().toISOString(),
      cacheable: false
    }));

  } else if (pathname === '/private') {
    // Private content - cache only in browser
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, max-age=300'
    });
    res.end(JSON.stringify({
      message: 'This is private content',
      userId: 123,
      privateCache: true
    }));

  } else if (pathname === '/users') {
    const store = dataStore.users;
    const clientETag = req.headers['if-none-match'];

    console.log('Request ETag:', clientETag);
    console.log('Server ETag:', store.etag);

    // Check if client has current version
    if (clientETag === store.etag) {
      console.log('→ 304 Not Modified');
      res.writeHead(304, {
        'ETag': store.etag,
        'Cache-Control': 'max-age=60'
      });
      res.end();
      return;
    }

    // Send full response with ETag
    console.log('→ 200 OK with content');
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'ETag': store.etag,
      'Cache-Control': 'max-age=60'
    });
    res.end(JSON.stringify({
      users: store.data,
      etag: store.etag
    }, null, 2));

  } else if (pathname === '/update-users') {
    // Modify data (changes ETag)
    const newUser = {
      id: Date.now(),
      name: `User ${Date.now()}`
    };

    dataStore.users.data.push(newUser);
    updateData('users', dataStore.users.data);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: 'User added',
      user: newUser,
      newETag: dataStore.users.etag
    }));

  } else if (pathname === '/data') {
    const store = dataStore.users;
    const ifModifiedSince = req.headers['if-modified-since'];

    if (ifModifiedSince) {
      const clientDate = new Date(ifModifiedSince);
      const serverDate = new Date(store.lastModified);

      // Remove milliseconds for comparison
      clientDate.setMilliseconds(0);
      serverDate.setMilliseconds(0);

      console.log('If-Modified-Since:', clientDate.toUTCString());
      console.log('Last-Modified:', serverDate.toUTCString());

      if (serverDate <= clientDate) {
        console.log('→ 304 Not Modified');
        res.writeHead(304, {
          'Last-Modified': serverDate.toUTCString(),
          'Cache-Control': 'max-age=60'
        });
        res.end();
        return;
      }
    }

    console.log('→ 200 OK with content');
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Last-Modified': store.lastModified.toUTCString(),
      'Cache-Control': 'max-age=60'
    });
    res.end(JSON.stringify({
      data: store.data,
      lastModified: store.lastModified
    }, null, 2));

  } else if (pathname === '/no-store') {
    // Never cache this
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify({
      message: 'This should never be cached',
      sensitiveData: 'secret'
    }));

  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

const PORT = 3000;

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/\n`);
  console.log('Caching strategies:');
  console.log('  /static   - Cache for 1 hour');
  console.log('  /dynamic  - Never cache');
  console.log('  /private  - Cache only in browser');
  console.log('  /users    - Conditional caching with ETag');
  console.log('  /data     - Conditional caching with Last-Modified\n');
});

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.close(() => process.exit(0));
});

/**
 * Key Concepts:
 *
 * 1. Cache-Control directives:
 *    - public: Can be cached by any cache
 *    - private: Only browser cache
 *    - no-cache: Revalidate before use
 *    - no-store: Never cache
 *    - max-age: Cache lifetime in seconds
 *
 * 2. ETags:
 *    - Hash of content
 *    - Client sends If-None-Match header
 *    - Server returns 304 if unchanged
 *
 * 3. Last-Modified:
 *    - Timestamp of last change
 *    - Client sends If-Modified-Since header
 *    - Server returns 304 if not modified
 *
 * 4. Benefits:
 *    - Reduces bandwidth
 *    - Faster page loads
 *    - Less server load
 *    - Better user experience
 */
