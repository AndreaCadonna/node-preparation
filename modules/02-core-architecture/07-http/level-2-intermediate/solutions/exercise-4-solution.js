/**
 * Exercise 4: Middleware Chain - SOLUTION
 *
 * Complete implementation of an Express-like middleware system with:
 * - App class with middleware support
 * - Common middleware (logger, body parser, CORS, etc.)
 * - Router with path parameters
 * - Error handling
 */

const http = require('http');
const url = require('url');
const querystring = require('querystring');

console.log('=== Exercise 4: Middleware Chain - SOLUTION ===\n');

// ============================================================================
// Task 1: App Class with Middleware Support
// ============================================================================

/**
 * App class - Core application with middleware chain
 *
 * This demonstrates the middleware pattern:
 * - Chain of responsibility pattern
 * - Each middleware can:
 *   1. Process request/response
 *   2. Call next() to continue chain
 *   3. End response (stops chain)
 *   4. Throw error (caught by error handler)
 */
class App {
  constructor() {
    this.middlewares = [];
  }

  /**
   * Add middleware to chain
   *
   * Middleware signature: (req, res, next) => void
   * - req: HTTP request object (enhanced with parsed data)
   * - res: HTTP response object (enhanced with helper methods)
   * - next: Function to call next middleware
   */
  use(fn) {
    if (typeof fn !== 'function') {
      throw new Error('Middleware must be a function');
    }
    this.middlewares.push(fn);
    return this; // Allow chaining: app.use(m1).use(m2)
  }

  /**
   * Execute middleware chain
   *
   * This is the heart of the middleware system:
   * 1. Create enhanced request/response objects
   * 2. Execute middlewares sequentially
   * 3. Handle errors with error handler
   * 4. Ensure response is sent
   */
  async handle(req, res) {
    // Enhance request object with useful properties
    const parsedUrl = url.parse(req.url, true);
    req.pathname = parsedUrl.pathname;
    req.query = parsedUrl.query;
    req.params = {};

    // Enhance response object with helper methods
    res.json = (data) => {
      res.writeHead(res.statusCode || 200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data, null, 2));
    };

    res.status = (code) => {
      res.statusCode = code;
      return res; // Allow chaining: res.status(404).json({})
    };

    res.send = (data) => {
      if (typeof data === 'object') {
        return res.json(data);
      }
      res.writeHead(res.statusCode || 200, { 'Content-Type': 'text/plain' });
      res.end(String(data));
    };

    // Execute middleware chain
    let index = 0;

    const next = async (error) => {
      // If error, skip to error handler
      if (error) {
        return this.handleError(error, req, res);
      }

      // If all middleware executed, end
      if (index >= this.middlewares.length) {
        if (!res.headersSent) {
          res.status(404).json({ error: 'Not Found' });
        }
        return;
      }

      const middleware = this.middlewares[index++];

      try {
        // Execute middleware
        // Middleware can be sync or async
        await middleware(req, res, next);
      } catch (err) {
        // Catch errors and pass to error handler
        next(err);
      }
    };

    // Start the chain
    await next();
  }

  /**
   * Error handler
   */
  handleError(error, req, res) {
    console.error('Error:', error.message);

    if (res.headersSent) {
      return; // Can't send error if headers already sent
    }

    const statusCode = error.statusCode || 500;

    res.status(statusCode).json({
      success: false,
      error: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
}

// ============================================================================
// Task 2: Common Middleware
// ============================================================================

/**
 * 1. Logger Middleware - Logs all requests
 *
 * This demonstrates:
 * - Request/response timing
 * - Response interception using finish event
 * - Logging patterns
 */
function logger() {
  return (req, res, next) => {
    const start = Date.now();

    // Log when response finishes
    res.on('finish', () => {
      const duration = Date.now() - start;
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
    });

    next();
  };
}

/**
 * 2. Body Parser Middleware - Parses JSON and form data
 *
 * This demonstrates:
 * - Stream processing
 * - Content type negotiation
 * - Async middleware
 */
function bodyParser() {
  return async (req, res, next) => {
    // Only parse for methods that have a body
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
      return next();
    }

    const contentType = (req.headers['content-type'] || '').split(';')[0].toLowerCase();

    try {
      const chunks = [];

      // Collect body chunks
      for await (const chunk of req) {
        chunks.push(chunk);
      }

      const bodyString = Buffer.concat(chunks).toString();

      // Parse based on content type
      if (contentType === 'application/json') {
        req.body = bodyString ? JSON.parse(bodyString) : {};
      } else if (contentType === 'application/x-www-form-urlencoded') {
        req.body = querystring.parse(bodyString);
      } else {
        req.body = bodyString;
      }

      next();
    } catch (error) {
      const err = new Error('Invalid request body');
      err.statusCode = 400;
      next(err);
    }
  };
}

/**
 * 3. Cookie Parser Middleware - Parses cookies
 */
function cookieParser() {
  return (req, res, next) => {
    const cookies = {};
    const cookieHeader = req.headers.cookie;

    if (cookieHeader) {
      cookieHeader.split(';').forEach(cookie => {
        const [name, ...valueParts] = cookie.trim().split('=');
        if (name) {
          cookies[name] = valueParts.join('=');
        }
      });
    }

    req.cookies = cookies;
    next();
  };
}

/**
 * 4. CORS Middleware - Adds CORS headers
 *
 * Cross-Origin Resource Sharing (CORS):
 * - Allows browsers to make cross-origin requests
 * - Controls which origins, methods, headers are allowed
 */
function cors(options = {}) {
  const defaults = {
    origin: '*',
    methods: 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization',
    credentials: false
  };

  const config = { ...defaults, ...options };

  return (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', config.origin);
    res.setHeader('Access-Control-Allow-Methods', config.methods);
    res.setHeader('Access-Control-Allow-Headers', config.allowedHeaders);

    if (config.credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    next();
  };
}

/**
 * 5. Error Handler Middleware - Catches and handles errors
 *
 * Note: This should be added last in the middleware chain
 */
function errorHandler() {
  return (req, res, next) => {
    // If we reach here without response, it's a 404
    if (!res.headersSent) {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        path: req.url
      });
    }
  };
}

// ============================================================================
// Task 3: Router with Path Parameters
// ============================================================================

/**
 * Router class - Handles route matching with path parameters
 *
 * Features:
 * - HTTP method routing (GET, POST, etc.)
 * - Path parameters (/users/:id)
 * - Multiple handlers per route
 * - Route-specific middleware
 */
class Router {
  constructor() {
    this.routes = [];
  }

  /**
   * Add GET route
   */
  get(path, ...handlers) {
    this.addRoute('GET', path, handlers);
    return this;
  }

  /**
   * Add POST route
   */
  post(path, ...handlers) {
    this.addRoute('POST', path, handlers);
    return this;
  }

  /**
   * Add PUT route
   */
  put(path, ...handlers) {
    this.addRoute('PUT', path, handlers);
    return this;
  }

  /**
   * Add DELETE route
   */
  delete(path, ...handlers) {
    this.addRoute('DELETE', path, handlers);
    return this;
  }

  /**
   * Add route to routes array
   */
  addRoute(method, path, handlers) {
    // Convert path to regex pattern for matching
    // /users/:id -> /^\/users\/([^\/]+)$/
    const paramNames = [];
    const pattern = path
      .replace(/\//g, '\\/')              // Escape slashes
      .replace(/:(\w+)/g, (match, name) => {
        paramNames.push(name);            // Store parameter names
        return '([^\\/]+)';                // Match any non-slash characters
      });

    const regex = new RegExp(`^${pattern}$`);

    this.routes.push({
      method,
      path,
      regex,
      paramNames,
      handlers
    });
  }

  /**
   * Match route and extract parameters
   */
  match(method, pathname) {
    for (const route of this.routes) {
      if (route.method !== method) continue;

      const match = pathname.match(route.regex);

      if (match) {
        // Extract parameters from match
        const params = {};
        route.paramNames.forEach((name, index) => {
          params[name] = match[index + 1];
        });

        return { route, params };
      }
    }

    return null;
  }

  /**
   * Create middleware function for the router
   */
  middleware() {
    return async (req, res, next) => {
      const matched = this.match(req.method, req.pathname);

      if (!matched) {
        return next(); // No route matched, continue to next middleware
      }

      const { route, params } = matched;
      req.params = params;

      // Execute route handlers sequentially
      let handlerIndex = 0;

      const nextHandler = async (error) => {
        if (error) {
          return next(error);
        }

        if (handlerIndex >= route.handlers.length) {
          return; // All handlers executed
        }

        const handler = route.handlers[handlerIndex++];

        try {
          await handler(req, res, nextHandler);
        } catch (err) {
          next(err);
        }
      };

      await nextHandler();
    };
  }
}

// ============================================================================
// Demo Application
// ============================================================================

// Create app instance
const app = new App();

// Task 2: Add middleware
app.use(logger());
app.use(cors());
app.use(bodyParser());
app.use(cookieParser());

// Create router
const router = new Router();

// ============================================================================
// Define Routes
// ============================================================================

/**
 * GET / - Home page
 */
router.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Middleware Chain Demo</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 900px; margin: 50px auto; padding: 20px; }
        h1 { color: #333; }
        .endpoint { background: #f4f4f4; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .method { display: inline-block; padding: 3px 8px; border-radius: 3px; font-weight: bold; color: white; margin-right: 10px; font-size: 12px; }
        .get { background: #61affe; }
        .post { background: #49cc90; }
        .put { background: #fca130; }
        .delete { background: #f93e3e; }
        code { background: #e0e0e0; padding: 2px 5px; border-radius: 3px; }
        pre { background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 5px; overflow-x: auto; }
      </style>
    </head>
    <body>
      <h1>Middleware Chain Demo</h1>
      <p>Express-like middleware system built from scratch using Node.js HTTP module</p>

      <h2>Active Middleware</h2>
      <ul>
        <li>Logger - Logs all requests with timing</li>
        <li>CORS - Adds cross-origin headers</li>
        <li>Body Parser - Parses JSON and form data</li>
        <li>Cookie Parser - Parses cookies</li>
        <li>Router - Matches routes with path parameters</li>
      </ul>

      <h2>API Routes</h2>

      <div class="endpoint">
        <span class="method get">GET</span>
        <strong>/users</strong> - List all users
        <pre>curl http://localhost:3000/users</pre>
      </div>

      <div class="endpoint">
        <span class="method get">GET</span>
        <strong>/users/:id</strong> - Get user by ID
        <pre>curl http://localhost:3000/users/123</pre>
      </div>

      <div class="endpoint">
        <span class="method post">POST</span>
        <strong>/users</strong> - Create user
        <pre>curl -X POST http://localhost:3000/users \\
  -H "Content-Type: application/json" \\
  -d '{"name":"John","email":"john@example.com"}'</pre>
      </div>

      <div class="endpoint">
        <span class="method put">PUT</span>
        <strong>/users/:id</strong> - Update user
        <pre>curl -X PUT http://localhost:3000/users/123 \\
  -H "Content-Type: application/json" \\
  -d '{"name":"John Doe"}'</pre>
      </div>

      <div class="endpoint">
        <span class="method delete">DELETE</span>
        <strong>/users/:id</strong> - Delete user
        <pre>curl -X DELETE http://localhost:3000/users/123</pre>
      </div>

      <div class="endpoint">
        <span class="method post">POST</span>
        <strong>/echo</strong> - Echo request data
        <pre>curl -X POST http://localhost:3000/echo \\
  -H "Content-Type: application/json" \\
  -d '{"message":"Hello World"}' \\
  -b "session=abc123"</pre>
      </div>
    </body>
    </html>
  `);
});

/**
 * GET /users - List users
 */
router.get('/users', (req, res) => {
  const users = [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' },
    { id: 3, name: 'Charlie', email: 'charlie@example.com' }
  ];

  res.json({
    success: true,
    count: users.length,
    users
  });
});

/**
 * GET /users/:id - Get user by ID (demonstrates path parameters)
 */
router.get('/users/:id', (req, res) => {
  const { id } = req.params;

  const user = {
    id: parseInt(id),
    name: 'John Doe',
    email: 'john@example.com',
    role: 'user'
  };

  res.json({
    success: true,
    user,
    params: req.params  // Show extracted parameters
  });
});

/**
 * POST /users - Create user (demonstrates body parsing)
 */
router.post('/users', (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    const error = new Error('Name and email are required');
    error.statusCode = 400;
    throw error;
  }

  const user = {
    id: Date.now(),
    name,
    email,
    createdAt: new Date().toISOString()
  };

  res.status(201).json({
    success: true,
    message: 'User created',
    user
  });
});

/**
 * PUT /users/:id - Update user (demonstrates params + body)
 */
router.put('/users/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  res.json({
    success: true,
    message: 'User updated',
    userId: id,
    updates
  });
});

/**
 * DELETE /users/:id - Delete user
 */
router.delete('/users/:id', (req, res) => {
  const { id } = req.params;

  res.json({
    success: true,
    message: 'User deleted',
    userId: id
  });
});

/**
 * POST /echo - Echo all request data
 * Demonstrates all parsed data: body, query, cookies, params
 */
router.post('/echo', (req, res) => {
  res.json({
    success: true,
    request: {
      method: req.method,
      url: req.url,
      pathname: req.pathname,
      query: req.query,
      params: req.params,
      headers: req.headers,
      cookies: req.cookies,
      body: req.body
    }
  });
});

// Add router middleware to app
app.use(router.middleware());

// Add error handler as last middleware
app.use(errorHandler());

// ============================================================================
// Create HTTP Server
// ============================================================================

const server = http.createServer((req, res) => {
  app.handle(req, res);
});

// ============================================================================
// Server Startup
// ============================================================================

const PORT = 3000;

server.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log('Middleware Chain Server Running');
  console.log(`${'='.repeat(60)}`);
  console.log(`\nServer URL: http://localhost:${PORT}/`);
  console.log(`\nActive Middleware:`);
  console.log(`  1. Logger          - Request/response logging`);
  console.log(`  2. CORS            - Cross-origin support`);
  console.log(`  3. Body Parser     - JSON/form parsing`);
  console.log(`  4. Cookie Parser   - Cookie parsing`);
  console.log(`  5. Router          - Route matching`);
  console.log(`  6. Error Handler   - Error handling`);
  console.log(`\nRoutes:`);
  console.log(`  GET    /              - Home page`);
  console.log(`  GET    /users         - List users`);
  console.log(`  GET    /users/:id     - Get user`);
  console.log(`  POST   /users         - Create user`);
  console.log(`  PUT    /users/:id     - Update user`);
  console.log(`  DELETE /users/:id     - Delete user`);
  console.log(`  POST   /echo          - Echo request`);
  console.log(`\n${'='.repeat(60)}\n`);
});

// ============================================================================
// Graceful Shutdown
// ============================================================================

process.on('SIGTERM', () => {
  console.log('\nSIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// ============================================================================
// Educational Notes
// ============================================================================

console.log('Implementation Highlights:');
console.log('✓ Express-like App class with middleware chain');
console.log('✓ Async middleware support');
console.log('✓ Router with path parameters (/users/:id)');
console.log('✓ Common middleware (logger, CORS, body parser, cookies)');
console.log('✓ Enhanced request/response objects');
console.log('✓ Error handling with try-catch');
console.log('✓ Method chaining for cleaner API');
console.log('✓ Route-specific handlers');
console.log('');
