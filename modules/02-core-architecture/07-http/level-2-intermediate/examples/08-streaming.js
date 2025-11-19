/**
 * Example 8: Response Streaming
 *
 * Demonstrates:
 * - Streaming large responses
 * - Server-Sent Events (SSE)
 * - Chunked transfer encoding
 * - Streaming files
 * - Real-time data streaming
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

console.log('=== Response Streaming Example ===\n');

// Generate large data file if it doesn't exist
const LARGE_FILE = path.join(__dirname, 'large-data.txt');
if (!fs.existsSync(LARGE_FILE)) {
  console.log('Generating large data file...');
  const stream = fs.createWriteStream(LARGE_FILE);
  for (let i = 0; i < 100000; i++) {
    stream.write(`Line ${i}: ${'x'.repeat(100)}\n`);
  }
  stream.end();
  console.log('Large file created\n');
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (pathname === '/') {
    // Home page with links
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Streaming Examples</title>
        <style>
          body { font-family: Arial; max-width: 800px; margin: 50px auto; }
          pre { background: #f0f0f0; padding: 10px; max-height: 300px; overflow: auto; }
          .live { background: #e3f2fd; padding: 10px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <h1>Response Streaming Examples</h1>

        <h2>1. File Streaming</h2>
        <p><a href="/stream-file">Stream large file</a> (efficient memory usage)</p>
        <p><a href="/download-file">Download file</a> (with progress)</p>

        <h2>2. Chunked Response</h2>
        <p><a href="/chunked">Chunked response example</a></p>

        <h2>3. Server-Sent Events (SSE)</h2>
        <p><a href="/sse-demo">SSE Demo Page</a></p>
        <div class="live">
          <h3>Live Events:</h3>
          <div id="events"></div>
        </div>

        <h2>4. JSON Stream</h2>
        <p><a href="/json-stream">Stream JSON data</a></p>

        <script>
          // SSE client
          const evtSource = new EventSource('/sse');
          evtSource.onmessage = (event) => {
            const div = document.getElementById('events');
            const p = document.createElement('p');
            p.textContent = event.data;
            div.appendChild(p);
          };
        </script>
      </body>
      </html>
    `);

  } else if (pathname === '/stream-file') {
    // Stream large file efficiently
    console.log('Streaming large file...');

    const stat = fs.statSync(LARGE_FILE);

    res.writeHead(200, {
      'Content-Type': 'text/plain',
      'Content-Length': stat.size,
      'Content-Disposition': 'inline'
    });

    const readStream = fs.createReadStream(LARGE_FILE);

    // Track progress
    let bytesRead = 0;
    readStream.on('data', (chunk) => {
      bytesRead += chunk.length;
      const progress = ((bytesRead / stat.size) * 100).toFixed(1);
      console.log(`Progress: ${progress}%`);
    });

    readStream.on('end', () => {
      console.log('File streaming complete');
    });

    readStream.on('error', (error) => {
      console.error('Stream error:', error);
      res.statusCode = 500;
      res.end('Error streaming file');
    });

    // Pipe file to response
    readStream.pipe(res);

  } else if (pathname === '/download-file') {
    // Download with proper headers
    const stat = fs.statSync(LARGE_FILE);

    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Length': stat.size,
      'Content-Disposition': 'attachment; filename="data.txt"'
    });

    fs.createReadStream(LARGE_FILE).pipe(res);

  } else if (pathname === '/chunked') {
    // Chunked transfer encoding
    res.writeHead(200, {
      'Content-Type': 'text/plain',
      'Transfer-Encoding': 'chunked'
    });

    let count = 0;
    const interval = setInterval(() => {
      if (count >= 10) {
        clearInterval(interval);
        res.end('\nStream complete!');
        return;
      }

      res.write(`Chunk ${count++}: ${new Date().toISOString()}\n`);
    }, 500);

    // Clean up on client disconnect
    req.on('close', () => {
      clearInterval(interval);
      console.log('Client disconnected');
    });

  } else if (pathname === '/sse') {
    // Server-Sent Events
    console.log('SSE client connected');

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // Send event every 2 seconds
    let eventId = 0;
    const interval = setInterval(() => {
      const data = {
        id: eventId++,
        time: new Date().toISOString(),
        random: Math.random()
      };

      res.write(`id: ${data.id}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }, 2000);

    // Clean up on disconnect
    req.on('close', () => {
      clearInterval(interval);
      console.log('SSE client disconnected');
    });

  } else if (pathname === '/sse-demo') {
    // SSE demo page
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Server-Sent Events Demo</title>
        <style>
          body { font-family: Arial; max-width: 800px; margin: 50px auto; }
          #messages { background: #f0f0f0; padding: 20px; height: 400px; overflow-y: auto; }
          .message { padding: 5px; border-bottom: 1px solid #ccc; }
        </style>
      </head>
      <body>
        <h1>Server-Sent Events Demo</h1>
        <p>Real-time updates from server:</p>
        <div id="messages"></div>
        <button onclick="stop()">Stop Updates</button>

        <script>
          const messagesDiv = document.getElementById('messages');
          const evtSource = new EventSource('/sse');

          evtSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            const div = document.createElement('div');
            div.className = 'message';
            div.innerHTML = \`
              <strong>Event #\${data.id}</strong><br>
              Time: \${data.time}<br>
              Random: \${data.random.toFixed(4)}
            \`;
            messagesDiv.insertBefore(div, messagesDiv.firstChild);
          };

          evtSource.onerror = () => {
            console.error('SSE connection error');
          };

          function stop() {
            evtSource.close();
            messagesDiv.insertAdjacentHTML('afterbegin',
              '<div class="message" style="color: red;">Connection closed</div>');
          }
        </script>
      </body>
      </html>
    `);

  } else if (pathname === '/json-stream') {
    // Stream JSON data
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Transfer-Encoding': 'chunked'
    });

    res.write('[\n');

    let count = 0;
    const maxItems = 100;

    const interval = setInterval(() => {
      if (count >= maxItems) {
        clearInterval(interval);
        res.end('\n]');
        return;
      }

      const item = {
        id: count,
        timestamp: Date.now(),
        data: `Item ${count}`
      };

      const prefix = count > 0 ? ',\n' : '';
      res.write(prefix + '  ' + JSON.stringify(item));
      count++;
    }, 100);

    req.on('close', () => {
      clearInterval(interval);
    });

  } else if (pathname === '/progress') {
    // Simulate long-running task with progress updates
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache'
    });

    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;

      res.write(`data: ${JSON.stringify({
        progress: progress,
        message: `Processing... ${progress}%`
      })}\n\n`);

      if (progress >= 100) {
        clearInterval(interval);
        res.write('data: {"progress": 100, "message": "Complete!"}\n\n');
        res.end();
      }
    }, 500);

    req.on('close', () => {
      clearInterval(interval);
    });

  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

const PORT = 3000;

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/\n`);
  console.log('Streaming endpoints:');
  console.log('  /stream-file  - Stream large file');
  console.log('  /chunked      - Chunked response');
  console.log('  /sse          - Server-Sent Events');
  console.log('  /sse-demo     - SSE demo page');
  console.log('  /json-stream  - Stream JSON data');
  console.log('  /progress     - Progress updates\n');
  console.log('Try:');
  console.log('  curl http://localhost:3000/chunked');
  console.log('  curl http://localhost:3000/json-stream\n');
});

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.close(() => process.exit(0));
});

/**
 * Key Concepts:
 *
 * 1. Streaming prevents loading entire response into memory
 * 2. fs.createReadStream() pipes file efficiently
 * 3. Chunked encoding allows unknown content length
 * 4. Server-Sent Events (SSE) for real-time updates
 * 5. EventSource API in browser for SSE
 * 6. Always clean up intervals on client disconnect
 * 7. Set proper headers for streaming
 *
 * Use Cases:
 * - Large file downloads
 * - Real-time notifications
 * - Progress updates
 * - Live data feeds
 * - Log streaming
 * - Video/audio streaming
 */
