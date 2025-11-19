/**
 * Exercise 4: Middleware Chain
 *
 * Build a complete middleware system like Express.
 */

const http = require('http');

// Task 1: Create App class with middleware support
class App {
  constructor() {
    this.middlewares = [];
  }

  use(fn) {
    // TODO: Add middleware to chain
  }

  async handle(req, res) {
    // TODO: Execute middleware chain
  }
}

// Task 2: Create these middleware:
// 1. Logger - logs requests
// 2. Body parser - parses JSON/form data
// 3. Cookie parser - parses cookies
// 4. CORS - adds CORS headers
// 5. Error handler - catches and handles errors

// Task 3: Create router with path parameters
class Router {
  constructor() {
    this.routes = [];
  }

  get(path, ...handlers) {
    // TODO: Add GET route
  }

  post(path, ...handlers) {
    // TODO: Add POST route
  }

  // Add support for path parameters: /users/:id
}

const app = new App();

// TODO: Add middleware
// TODO: Add routes
// TODO: Handle requests

const server = http.createServer((req, res) => {
  app.handle(req, res);
});

server.listen(3000);
