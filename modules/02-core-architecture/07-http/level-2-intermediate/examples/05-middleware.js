/**
 * Example 5: Middleware Pattern
 *
 * Demonstrates:
 * - Implementing middleware pattern
 * - Chaining middleware functions
 * - Request/response modification
 * - Error handling middleware
 */

const http = require('http');
const url = require('url');

console.log('=== Middleware Pattern Example ===\n');

// Middleware manager
class App {
  constructor() {
    this.middlewares = [];
    this.errorHandlers = [];
  }

  use(fn) {
    if (fn.length === 4) {
      // Error handling middleware (err, req, res, next)
      this.errorHandlers.push(fn);
    } else {
      // Regular middleware (req, res, next)
      this.middlewares.push(fn);
    }
    return this;
  }

  async handle(req, res) {
    let index = 0;

    const next = async (err) => {
      if (err) {
        // Handle error
        return this.handleError(err, req, res);
      }

      if (index >= this.middlewares.length) {
        // No more middleware
        if (!res.headersSent) {
          res.statusCode = 404;
          res.end('Not Found');
        }
        return;
      }

      const middleware = this.middlewares[index++];

      try {
        await middleware(req, res, next);
      } catch (error) {
        next(error);
      }
    };

    await next();
  }

  async handleError(err, req, res) {
    if (this.errorHandlers.length === 0) {
      console.error('Unhandled error:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
      return;
    }

    for (const handler of this.errorHandlers) {
      try {
        await handler(err, req, res, () => {});
        if (res.headersSent) break;
      } catch (error) {
        console.error('Error in error handler:', error);
      }
    }

    if (!res.headersSent) {
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  }
}

// Create app instance
const app = new App();

// Middleware 1: Logger
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`→ ${req.method} ${req.url}`);

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`← ${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
  });

  next();
});

// Middleware 2: Parse URL
app.use((req, res, next) => {
  req.parsedUrl = url.parse(req.url, true);
  req.pathname = req.parsedUrl.pathname;
  req.query = req.parsedUrl.query;
  next();
});

// Middleware 3: Parse cookies
app.use((req, res, next) => {
  req.cookies = {};
  const cookieHeader = req.headers.cookie;

  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      req.cookies[name] = decodeURIComponent(value);
    });
  }

  next();
});

// Middleware 4: Body parser
app.use(async (req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    let body = '';

    for await (const chunk of req) {
      body += chunk.toString();
    }

    try {
      const contentType = req.headers['content-type'] || '';
      if (contentType.includes('application/json')) {
        req.body = JSON.parse(body);
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        req.body = Object.fromEntries(new URLSearchParams(body));
      } else {
        req.body = body;
      }
    } catch (error) {
      return next(new Error('Invalid body format'));
    }
  }

  next();
});

// Middleware 5: Add helper methods to response
app.use((req, res, next) => {
  // JSON response helper
  res.json = (data, statusCode = 200) => {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };

  // HTML response helper
  res.html = (html, statusCode = 200) => {
    res.writeHead(statusCode, { 'Content-Type': 'text/html' });
    res.end(html);
  };

  // Redirect helper
  res.redirect = (location, statusCode = 302) => {
    res.writeHead(statusCode, { 'Location': location });
    res.end();
  };

  next();
});

// Middleware 6: Authentication check
app.use((req, res, next) => {
  // Attach user info if authenticated
  if (req.cookies.sessionId) {
    req.user = {
      id: 1,
      username: 'demo',
      authenticated: true
    };
  }
  next();
});

// Route handlers (also middleware!)
app.use((req, res, next) => {
  if (req.pathname === '/' && req.method === 'GET') {
    res.html(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Middleware Example</title>
        <style>
          body { font-family: Arial; max-width: 800px; margin: 50px auto; }
          pre { background: #f0f0f0; padding: 10px; }
        </style>
      </head>
      <body>
        <h1>Middleware Pattern</h1>
        <h2>Request Info (added by middleware):</h2>
        <pre>${JSON.stringify({
          pathname: req.pathname,
          query: req.query,
          cookies: req.cookies,
          user: req.user
        }, null, 2)}</pre>
        <h2>Routes:</h2>
        <ul>
          <li><a href="/api/data">GET /api/data</a></li>
          <li><a href="/protected">GET /protected</a></li>
          <li><a href="/error">Trigger error</a></li>
        </ul>
      </body>
      </html>
    `);
  } else {
    next(); // Pass to next middleware
  }
});

app.use((req, res, next) => {
  if (req.pathname === '/api/data' && req.method === 'GET') {
    res.json({
      message: 'Data from API',
      timestamp: new Date().toISOString(),
      user: req.user
    });
  } else {
    next();
  }
});

// Protected route middleware
app.use((req, res, next) => {
  if (req.pathname === '/protected') {
    if (!req.user?.authenticated) {
      res.statusCode = 401;
      return res.json({ error: 'Unauthorized' }, 401);
    }

    res.json({
      message: 'Secret data',
      user: req.user
    });
  } else {
    next();
  }
});

// Error trigger route
app.use((req, res, next) => {
  if (req.pathname === '/error') {
    throw new Error('Intentional error for testing');
  }
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error caught by middleware:', err.message);

  res.json({
    error: true,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  }, 500);
});

// Create HTTP server
const server = http.createServer((req, res) => {
  app.handle(req, res);
});

const PORT = 3000;

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/\n`);
  console.log('Middleware chain:');
  console.log('  1. Logger');
  console.log('  2. URL Parser');
  console.log('  3. Cookie Parser');
  console.log('  4. Body Parser');
  console.log('  5. Response Helpers');
  console.log('  6. Authentication');
  console.log('  7. Route Handlers');
  console.log('  8. Error Handler\n');
});

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.close(() => process.exit(0));
});

/**
 * Key Concepts:
 *
 * 1. Middleware are functions that process requests sequentially
 * 2. Each middleware calls next() to pass control
 * 3. Middleware can modify req and res objects
 * 4. Order matters - middleware execute in order added
 * 5. Error handling middleware have 4 parameters
 * 6. Middleware can short-circuit by not calling next()
 * 7. This pattern is used by Express, Koa, etc.
 */
