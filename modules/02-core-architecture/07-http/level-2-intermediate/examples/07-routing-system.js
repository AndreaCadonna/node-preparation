/**
 * Example 7: Advanced Routing System
 *
 * Demonstrates:
 * - Building a flexible routing system
 * - Path parameters (/users/:id)
 * - Route matching and wildcards
 * - Method-based routing
 * - Route middleware
 */

const http = require('http');

console.log('=== Advanced Routing System Example ===\n');

// Router class
class Router {
  constructor() {
    this.routes = [];
  }

  // Add route
  addRoute(method, pattern, ...handlers) {
    this.routes.push({
      method: method.toUpperCase(),
      pattern: this.compilePattern(pattern),
      handlers: handlers
    });
  }

  // Compile pattern to regex
  compilePattern(pattern) {
    const paramNames = [];

    // Extract parameter names
    const regexPattern = pattern
      .replace(/:[^/]+/g, (match) => {
        paramNames.push(match.slice(1)); // Remove ':'
        return '([^/]+)'; // Match any non-slash characters
      })
      .replace(/\*/g, '(.*)'); // Wildcard

    return {
      regex: new RegExp(`^${regexPattern}$`),
      paramNames: paramNames,
      original: pattern
    };
  }

  // Find matching route
  match(method, pathname) {
    for (const route of this.routes) {
      if (route.method !== method && route.method !== 'ALL') {
        continue;
      }

      const match = pathname.match(route.pattern.regex);
      if (match) {
        const params = {};
        route.pattern.paramNames.forEach((name, index) => {
          params[name] = match[index + 1];
        });

        return {
          route: route,
          params: params
        };
      }
    }

    return null;
  }

  // HTTP method shortcuts
  get(pattern, ...handlers) {
    this.addRoute('GET', pattern, ...handlers);
  }

  post(pattern, ...handlers) {
    this.addRoute('POST', pattern, ...handlers);
  }

  put(pattern, ...handlers) {
    this.addRoute('PUT', pattern, ...handlers);
  }

  delete(pattern, ...handlers) {
    this.addRoute('DELETE', pattern, ...handlers);
  }

  all(pattern, ...handlers) {
    this.addRoute('ALL', pattern, ...handlers);
  }

  // Handle request
  async handle(req, res) {
    const matched = this.match(req.method, req.pathname);

    if (!matched) {
      res.statusCode = 404;
      res.json({ error: 'Not Found' });
      return;
    }

    req.params = matched.params;

    // Execute handlers in sequence
    let index = 0;
    const handlers = matched.route.handlers;

    const next = async (err) => {
      if (err) {
        res.statusCode = 500;
        res.json({ error: err.message });
        return;
      }

      if (index >= handlers.length) {
        return;
      }

      const handler = handlers[index++];
      try {
        await handler(req, res, next);
      } catch (error) {
        next(error);
      }
    };

    await next();
  }
}

// Create router
const router = new Router();

// Helper middleware - JSON response
function jsonResponse(req, res, next) {
  res.json = (data, statusCode = 200) => {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data, null, 2));
  };
  next();
}

// Logger middleware
function logger(req, res, next) {
  console.log(`${req.method} ${req.pathname} - Params:`, req.params);
  next();
}

// Define routes

// Home
router.get('/', jsonResponse, (req, res) => {
  res.json({
    message: 'Advanced Routing System',
    routes: router.routes.map(r => ({
      method: r.method,
      pattern: r.pattern.original
    }))
  });
});

// Users collection
router.get('/users', jsonResponse, logger, (req, res) => {
  res.json({
    users: [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' }
    ]
  });
});

// Single user (with parameter)
router.get('/users/:id', jsonResponse, logger, (req, res) => {
  const userId = req.params.id;
  res.json({
    user: {
      id: userId,
      name: `User ${userId}`,
      email: `user${userId}@example.com`
    }
  });
});

// User posts
router.get('/users/:userId/posts/:postId', jsonResponse, logger, (req, res) => {
  res.json({
    user: req.params.userId,
    post: req.params.postId,
    title: 'Sample Post',
    content: 'This is a sample post'
  });
});

// Create user
router.post('/users', jsonResponse, logger, async (req, res) => {
  res.json({
    message: 'User created',
    user: req.body
  }, 201);
});

// Update user
router.put('/users/:id', jsonResponse, logger, (req, res) => {
  res.json({
    message: 'User updated',
    userId: req.params.id,
    updates: req.body
  });
});

// Delete user
router.delete('/users/:id', jsonResponse, logger, (req, res) => {
  res.json({
    message: 'User deleted',
    userId: req.params.id
  });
});

// Wildcard route (catch-all for /api/*)
router.get('/api/*', jsonResponse, (req, res) => {
  res.json({
    message: 'API wildcard route',
    path: req.pathname
  });
});

// Multiple middleware example
const authCheck = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    res.statusCode = 401;
    res.json({ error: 'Unauthorized' });
    return;
  }
  req.user = { id: 1, name: 'AuthenticatedUser' };
  next();
};

router.get('/protected', jsonResponse, authCheck, (req, res) => {
  res.json({
    message: 'Protected resource',
    user: req.user
  });
});

// Create HTTP server
const server = http.createServer(async (req, res) => {
  // Parse URL
  const url = new URL(req.url, `http://${req.headers.host}`);
  req.pathname = url.pathname;
  req.query = Object.fromEntries(url.searchParams);

  // Parse body for POST/PUT
  if (req.method === 'POST' || req.method === 'PUT') {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }
    try {
      req.body = JSON.parse(body);
    } catch (e) {
      req.body = {};
    }
  }

  // Handle with router
  await router.handle(req, res);
});

const PORT = 3000;

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/\n`);
  console.log('Available routes:');
  console.log('  GET    /');
  console.log('  GET    /users');
  console.log('  GET    /users/:id');
  console.log('  GET    /users/:userId/posts/:postId');
  console.log('  POST   /users');
  console.log('  PUT    /users/:id');
  console.log('  DELETE /users/:id');
  console.log('  GET    /api/*');
  console.log('  GET    /protected\n');
  console.log('Try:');
  console.log('  curl http://localhost:3000/users/42');
  console.log('  curl http://localhost:3000/users/1/posts/5');
  console.log('  curl http://localhost:3000/api/anything/here');
  console.log('  curl -H "Authorization: token123" http://localhost:3000/protected\n');
});

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.close(() => process.exit(0));
});

/**
 * Key Concepts:
 *
 * 1. Routes are matched using regular expressions
 * 2. Path parameters extracted and passed to handlers
 * 3. Middleware can be chained per route
 * 4. Wildcards (*) match any path segment
 * 5. Routes checked in order of registration
 * 6. Method-specific routes (GET, POST, etc.)
 * 7. This is how Express.js routing works internally
 *
 * Advanced Features:
 * - Route grouping (with prefixes)
 * - Route priority/ordering
 * - Regular expression patterns
 * - Query parameter parsing
 * - Nested routers
 */
