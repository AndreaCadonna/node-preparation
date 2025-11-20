/**
 * Exercise 1 Solution: Basic Server and Routing
 *
 * This solution demonstrates:
 * - Creating an HTTP server with the http module
 * - Implementing route handling based on URL and method
 * - Sending different content types (text, JSON)
 * - Proper HTTP status codes and headers
 * - Error handling for server issues
 * - Graceful shutdown handling
 */

const http = require('http');

console.log('=== Exercise 1: Basic Server and Routing ===\n');

// Task 1: Create a server that handles multiple routes
/**
 * Implement a server with the following routes:
 * - GET / - Return "Welcome to my website!"
 * - GET /about - Return information about yourself
 * - GET /contact - Return your contact information
 * - GET /api/time - Return current time as JSON
 * - All other routes - Return 404 with "Page not found"
 *
 * Approach:
 * - Use req.url to get the requested path
 * - Use req.method to ensure it's a GET request
 * - Set appropriate Content-Type headers
 * - Use proper HTTP status codes (200, 404)
 */

const server = http.createServer((req, res) => {
  // Extract the URL and method from the request
  // req.url contains the path and query string (e.g., '/about', '/api/time?format=iso')
  // req.method contains the HTTP verb (e.g., 'GET', 'POST')
  const { url, method } = req;

  // Log each incoming request for debugging
  console.log(`${new Date().toISOString()} - ${method} ${url}`);

  // Route: GET /
  if (url === '/' && method === 'GET') {
    // Set status code to 200 (OK)
    res.statusCode = 200;

    // Set Content-Type header to indicate plain text response
    // This tells the client how to interpret the response body
    res.setHeader('Content-Type', 'text/plain');

    // Send the response and end the connection
    res.end('Welcome to my website!');
  }

  // Route: GET /about
  else if (url === '/about' && method === 'GET') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');

    // Multi-line response with information
    const aboutText = `About Me
===========
I'm learning Node.js HTTP module!
This server demonstrates basic routing and HTTP concepts.

Skills:
- HTTP server creation
- Route handling
- Status codes and headers
- JSON responses`;

    res.end(aboutText);
  }

  // Route: GET /contact
  else if (url === '/contact' && method === 'GET') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');

    const contactText = `Contact Information
==================
Email: student@nodejs.example.com
GitHub: github.com/nodejs-learner
LinkedIn: linkedin.com/in/nodejs-learner

Feel free to reach out!`;

    res.end(contactText);
  }

  // Route: GET /api/time
  else if (url === '/api/time' && method === 'GET') {
    res.statusCode = 200;

    // Set Content-Type to application/json for JSON responses
    // This is crucial for APIs - clients need to know they're receiving JSON
    res.setHeader('Content-Type', 'application/json');

    // Create a response object with current time information
    const timeData = {
      timestamp: Date.now(),
      iso: new Date().toISOString(),
      utc: new Date().toUTCString(),
      local: new Date().toString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    // Convert JavaScript object to JSON string
    // JSON.stringify() is necessary because res.end() expects a string or Buffer
    res.end(JSON.stringify(timeData, null, 2));
  }

  // All other routes - 404 Not Found
  else {
    // Set status code to 404 (Not Found)
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain');

    // Provide helpful error message
    res.end(`Page not found: ${url}\n\nAvailable routes:\n- GET /\n- GET /about\n- GET /contact\n- GET /api/time`);
  }
});

// Task 2: Make the server listen on port 3000
/**
 * Start the server listening on a specific port
 *
 * Approach:
 * - server.listen(port, callback) binds to a port and starts accepting connections
 * - The callback is called once the server is ready
 * - This is when you should log "Server is running"
 */
const PORT = 3000;

server.listen(PORT, () => {
  console.log(`✓ Server running at http://localhost:${PORT}/\n`);
  console.log('Available routes:');
  console.log(`  http://localhost:${PORT}/`);
  console.log(`  http://localhost:${PORT}/about`);
  console.log(`  http://localhost:${PORT}/contact`);
  console.log(`  http://localhost:${PORT}/api/time`);
  console.log('\nTest with curl:');
  console.log(`  curl http://localhost:${PORT}/`);
  console.log(`  curl http://localhost:${PORT}/api/time`);
  console.log('\nPress Ctrl+C to stop the server\n');
});

// Task 3: Add error handling for port in use
/**
 * Handle server errors (e.g., port already in use)
 *
 * Approach:
 * - Listen for 'error' event on the server
 * - EADDRINUSE error code indicates port is already in use
 * - Provide helpful error messages and exit gracefully
 */
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    // Port is already in use by another application
    console.error(`✗ Error: Port ${PORT} is already in use`);
    console.error('  Try one of these solutions:');
    console.error('  1. Stop the other application using this port');
    console.error(`  2. Use a different port (change PORT variable)`);
    console.error(`  3. Find and kill the process: lsof -ti:${PORT} | xargs kill`);
    process.exit(1);
  } else if (error.code === 'EACCES') {
    // Permission denied (usually for ports < 1024)
    console.error(`✗ Error: Permission denied for port ${PORT}`);
    console.error('  Ports below 1024 require administrator privileges');
    console.error('  Try using a port number >= 1024');
    process.exit(1);
  } else {
    // Other errors
    console.error('✗ Server error:', error.message);
    console.error(error);
    process.exit(1);
  }
});

// Task 4: Add graceful shutdown on Ctrl+C
/**
 * Handle graceful shutdown when user presses Ctrl+C
 *
 * Approach:
 * - Listen for SIGINT signal (sent by Ctrl+C)
 * - Close the server to stop accepting new connections
 * - Wait for existing connections to complete
 * - Exit the process cleanly
 */
process.on('SIGINT', () => {
  console.log('\n\nReceived SIGINT (Ctrl+C), shutting down gracefully...');

  // Close the server
  // This stops accepting new connections but allows existing ones to complete
  server.close(() => {
    console.log('✓ Server closed');
    console.log('✓ All connections terminated');
    console.log('Goodbye!\n');
    process.exit(0);
  });

  // Set a timeout to force exit if graceful shutdown takes too long
  // This prevents the server from hanging if connections don't close
  setTimeout(() => {
    console.error('✗ Forcing shutdown - connections did not close in time');
    process.exit(1);
  }, 10000); // 10 second timeout
});

/**
 * Testing:
 * 1. Run: node exercise-1-solution.js
 * 2. Test with curl:
 *    curl http://localhost:3000/
 *    curl http://localhost:3000/about
 *    curl http://localhost:3000/contact
 *    curl http://localhost:3000/api/time
 *    curl http://localhost:3000/nonexistent
 *
 * Expected Results:
 * - / should return "Welcome to my website!"
 * - /about should return information about you
 * - /contact should return contact info
 * - /api/time should return JSON with current time
 * - /nonexistent should return 404
 */

/**
 * KEY LEARNING POINTS:
 *
 * 1. HTTP Server Creation:
 *    - http.createServer(callback) creates a server instance
 *    - Callback receives (req, res) for each request
 *    - Must call server.listen() to start accepting connections
 *
 * 2. Request Object (req):
 *    - req.url - the requested path (e.g., '/about')
 *    - req.method - HTTP method (e.g., 'GET', 'POST')
 *    - req.headers - object containing request headers
 *
 * 3. Response Object (res):
 *    - res.statusCode - set HTTP status code (200, 404, 500, etc.)
 *    - res.setHeader(name, value) - set response headers
 *    - res.end(data) - send response and close connection
 *
 * 4. HTTP Status Codes:
 *    - 200 OK - successful request
 *    - 404 Not Found - resource doesn't exist
 *    - 500 Internal Server Error - server error
 *
 * 5. Content-Type Header:
 *    - 'text/plain' - plain text
 *    - 'text/html' - HTML content
 *    - 'application/json' - JSON data
 *    - Important for client to interpret response correctly
 *
 * 6. Error Handling:
 *    - EADDRINUSE - port already in use
 *    - EACCES - permission denied (ports < 1024)
 *    - Always provide helpful error messages
 *
 * 7. Graceful Shutdown:
 *    - Listen for SIGINT (Ctrl+C)
 *    - Call server.close() to stop accepting connections
 *    - Allow existing requests to complete
 *    - Exit cleanly with process.exit(0)
 */

/**
 * COMMON MISTAKES TO AVOID:
 *
 * ❌ Forgetting to call res.end():
 *    res.setHeader('Content-Type', 'text/plain');
 *    // Forgot res.end() - connection hangs!
 *
 * ❌ Setting headers after sending response:
 *    res.end('Hello');
 *    res.setHeader('Content-Type', 'text/plain'); // Error!
 *
 * ❌ Not setting Content-Type for JSON:
 *    res.end(JSON.stringify({data: 'test'})); // Client may misinterpret
 *
 * ❌ Forgetting JSON.stringify():
 *    res.end({data: 'test'}); // Sends "[object Object]"
 *
 * ❌ Not checking HTTP method:
 *    if (url === '/api/time') // Accepts ALL methods, not just GET
 *
 * ❌ Hardcoding port without error handling:
 *    // If port is in use, app crashes with no helpful message
 */

/**
 * GOING FURTHER:
 *
 * Try these challenges:
 * 1. Add support for POST requests
 * 2. Implement a simple in-memory data store
 * 3. Add request logging with timestamps
 * 4. Create a middleware system for common functionality
 * 5. Add support for serving HTML files
 * 6. Implement basic authentication
 * 7. Add CORS headers for API routes
 * 8. Create a simple REST API with CRUD operations
 */
