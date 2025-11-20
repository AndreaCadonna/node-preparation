/**
 * Exercise 3 Solution: POST Request Handling
 *
 * This solution demonstrates:
 * - Reading and parsing request body data
 * - Handling POST requests with JSON data
 * - Data validation for user input
 * - In-memory data storage
 * - Creating RESTful API endpoints
 * - Error handling for invalid JSON and validation errors
 */

const http = require('http');

console.log('=== Exercise 3: POST Request Handling ===\n');

// Task 1: Parse request body helper
/**
 * Create a function that reads and parses the request body as JSON
 * Handle errors gracefully
 *
 * Approach:
 * - HTTP request body arrives as a stream of chunks
 * - Listen for 'data' events to collect chunks
 * - Listen for 'end' event when all data is received
 * - Parse the complete body as JSON
 * - Return a Promise for async/await compatibility
 */
function parseJSONBody(req) {
  return new Promise((resolve, reject) => {
    // Array to store body chunks
    // Each chunk is a Buffer containing part of the request body
    const chunks = [];

    // Listen for 'data' events
    // The request object is a readable stream
    // Data arrives in chunks (not all at once)
    req.on('data', (chunk) => {
      chunks.push(chunk);

      // Optional: Limit body size to prevent memory issues
      // Calculate total size of all chunks
      const totalSize = chunks.reduce((acc, chunk) => acc + chunk.length, 0);

      // If body is too large, reject and destroy the stream
      if (totalSize > 1e6) { // 1MB limit
        reject(new Error('Request body too large (max 1MB)'));
        req.connection.destroy(); // Stop receiving more data
      }
    });

    // Listen for 'end' event
    // This fires when all data has been received
    req.on('end', () => {
      try {
        // Concatenate all chunks into a single Buffer
        const body = Buffer.concat(chunks);

        // Convert Buffer to string
        const bodyString = body.toString('utf8');

        // If body is empty, return empty object
        if (!bodyString) {
          resolve({});
          return;
        }

        // Parse JSON
        // This can throw if JSON is invalid
        const parsed = JSON.parse(bodyString);
        resolve(parsed);
      } catch (error) {
        // JSON parsing failed
        reject(new Error('Invalid JSON in request body: ' + error.message));
      }
    });

    // Listen for 'error' events
    // Network errors, client disconnects, etc.
    req.on('error', (error) => {
      reject(error);
    });
  });
}

// In-memory storage
// In production, you'd use a database
const users = [];
let nextId = 1;

// Task 2: Create POST /users endpoint
/**
 * Accept POST requests with user data:
 * {
 *   "name": "Alice",
 *   "email": "alice@example.com",
 *   "age": 30
 * }
 *
 * Validate:
 * - name is required
 * - email is required and contains @
 * - age is optional but must be a number
 *
 * Return 201 with created user data
 * Return 400 for validation errors
 *
 * Approach:
 * - Parse request body using parseJSONBody
 * - Validate required fields and formats
 * - Assign unique ID to new user
 * - Store in users array
 * - Return created user with 201 status
 */

/**
 * Validate user data
 * @param {object} data - User data to validate
 * @returns {object} Validation result {valid: boolean, errors: string[]}
 */
function validateUser(data) {
  const errors = [];

  // Validate name
  if (!data.name) {
    errors.push('name is required');
  } else if (typeof data.name !== 'string') {
    errors.push('name must be a string');
  } else if (data.name.trim().length === 0) {
    errors.push('name cannot be empty');
  } else if (data.name.length > 100) {
    errors.push('name must be less than 100 characters');
  }

  // Validate email
  if (!data.email) {
    errors.push('email is required');
  } else if (typeof data.email !== 'string') {
    errors.push('email must be a string');
  } else if (!data.email.includes('@')) {
    errors.push('email must be a valid email address (must contain @)');
  } else if (data.email.length > 200) {
    errors.push('email must be less than 200 characters');
  }

  // Check for duplicate email
  if (data.email && users.some(u => u.email === data.email)) {
    errors.push('email already exists');
  }

  // Validate age (optional)
  if (data.age !== undefined && data.age !== null) {
    if (typeof data.age !== 'number') {
      errors.push('age must be a number');
    } else if (!Number.isInteger(data.age)) {
      errors.push('age must be an integer');
    } else if (data.age < 0) {
      errors.push('age must be a positive number');
    } else if (data.age > 150) {
      errors.push('age must be less than 150');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Handle POST /users - Create a new user
 */
async function handleCreateUser(req, res) {
  try {
    // Parse request body
    const data = await parseJSONBody(req);

    // Validate user data
    const validation = validateUser(data);

    if (!validation.valid) {
      // Validation failed - return 400 Bad Request
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        error: 'Validation failed',
        errors: validation.errors,
        received: data
      }, null, 2));
      return;
    }

    // Create new user object
    const newUser = {
      id: nextId++,
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      age: data.age || null,
      createdAt: new Date().toISOString()
    };

    // Store user
    users.push(newUser);

    // Return 201 Created
    res.statusCode = 201;
    res.setHeader('Content-Type', 'application/json');
    // Set Location header to point to the new resource
    res.setHeader('Location', `/users/${newUser.id}`);
    res.end(JSON.stringify({
      message: 'User created successfully',
      user: newUser
    }, null, 2));

    console.log('✓ Created user:', newUser.name);
  } catch (error) {
    // Error parsing JSON or other errors
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'Bad request',
      message: error.message
    }, null, 2));
  }
}

/**
 * Handle GET /users - Return all users
 */
function handleGetUsers(req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    count: users.length,
    users: users
  }, null, 2));
}

/**
 * Handle GET /users/:id - Get user by ID
 */
function handleGetUserById(req, res, userId) {
  // Find user by ID
  const user = users.find(u => u.id === userId);

  if (!user) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'Not found',
      message: `User with id ${userId} does not exist`
    }, null, 2));
    return;
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(user, null, 2));
}

// Create the HTTP server
const server = http.createServer(async (req, res) => {
  const { method, url } = req;

  // Log incoming request
  console.log(`${new Date().toISOString()} - ${method} ${url}`);

  // Route: POST /users - Create user
  if (url === '/users' && method === 'POST') {
    await handleCreateUser(req, res);
  }

  // Route: GET /users - Get all users
  else if (url === '/users' && method === 'GET') {
    handleGetUsers(req, res);
  }

  // Route: GET /users/:id - Get user by ID
  else if (url.startsWith('/users/') && method === 'GET') {
    // Extract ID from URL
    const id = parseInt(url.split('/')[2]);

    if (isNaN(id)) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        error: 'Invalid user ID',
        message: 'User ID must be a number'
      }, null, 2));
      return;
    }

    handleGetUserById(req, res, id);
  }

  // Route: GET / - API documentation
  else if (url === '/' && method === 'GET') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end(`User Management API
===================

Endpoints:

1. POST /users
   Create a new user
   Body: {
     "name": "Alice",          (required, string)
     "email": "alice@ex.com",  (required, string with @)
     "age": 30                 (optional, number)
   }

2. GET /users
   Get all users

3. GET /users/:id
   Get user by ID

Examples:
  # Create a user
  curl -X POST http://localhost:3000/users \\
    -H "Content-Type: application/json" \\
    -d '{"name":"Alice","email":"alice@example.com","age":30}'

  # Get all users
  curl http://localhost:3000/users

  # Get user by ID
  curl http://localhost:3000/users/1

Current users: ${users.length}
`);
  }

  // Handle 404
  else {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'Not found',
      message: `Cannot ${method} ${url}`,
      availableEndpoints: [
        'POST /users',
        'GET /users',
        'GET /users/:id'
      ]
    }, null, 2));
  }
});

const PORT = 3000;

server.listen(PORT, () => {
  console.log(`✓ Server running at http://localhost:${PORT}/\n`);
  console.log('Try these commands:');
  console.log('  # Create a user');
  console.log('  curl -X POST http://localhost:3000/users \\');
  console.log('    -H "Content-Type: application/json" \\');
  console.log('    -d \'{"name":"Alice","email":"alice@example.com","age":30}\'');
  console.log('');
  console.log('  # Get all users');
  console.log('  curl http://localhost:3000/users');
  console.log('\nPress Ctrl+C to stop\n');
});

// Error handling
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`✗ Error: Port ${PORT} is already in use`);
    process.exit(1);
  } else {
    console.error('✗ Server error:', error.message);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down gracefully...');
  server.close(() => {
    console.log('✓ Server closed');
    console.log(`Final user count: ${users.length}`);
    process.exit(0);
  });
});

/**
 * Testing:
 * 1. Create users:
 *    curl -X POST http://localhost:3000/users \
 *      -H "Content-Type: application/json" \
 *      -d '{"name":"Alice","email":"alice@example.com","age":30}'
 *
 *    curl -X POST http://localhost:3000/users \
 *      -H "Content-Type: application/json" \
 *      -d '{"name":"Bob","email":"bob@example.com"}'
 *
 * 2. Test validation (should fail):
 *    curl -X POST http://localhost:3000/users \
 *      -H "Content-Type: application/json" \
 *      -d '{"name":"Charlie"}'
 *
 * 3. Get all users:
 *    curl http://localhost:3000/users
 *
 * 4. Get user by ID:
 *    curl http://localhost:3000/users/1
 */

/**
 * KEY LEARNING POINTS:
 *
 * 1. Request Body Parsing:
 *    - HTTP body arrives as a stream of chunks
 *    - Listen for 'data' events to collect chunks
 *    - Listen for 'end' event when complete
 *    - Use Buffer.concat() to combine chunks
 *    - Parse JSON with JSON.parse()
 *
 * 2. Streams and Chunks:
 *    - Request body is a readable stream
 *    - Data arrives in chunks (not all at once)
 *    - Must collect all chunks before parsing
 *    - Always handle errors and size limits
 *
 * 3. Async/Await with HTTP:
 *    - Use async function for request handler
 *    - Await parseJSONBody() to get complete data
 *    - Handle errors with try/catch
 *    - Makes code more readable than callbacks
 *
 * 4. Data Validation:
 *    - Always validate user input
 *    - Check required fields
 *    - Validate data types
 *    - Validate formats (email, etc.)
 *    - Return detailed error messages
 *
 * 5. HTTP Status Codes:
 *    - 201 Created - resource created successfully
 *    - 400 Bad Request - validation or parsing error
 *    - 404 Not Found - resource doesn't exist
 *
 * 6. RESTful API Design:
 *    - POST /users - create new user
 *    - GET /users - get all users
 *    - GET /users/:id - get specific user
 *    - Use proper status codes
 *    - Return JSON responses
 *
 * 7. Security Considerations:
 *    - Limit request body size
 *    - Validate all input
 *    - Sanitize data (trim, lowercase)
 *    - Prevent duplicate emails
 *    - Handle malformed JSON
 */

/**
 * COMMON MISTAKES TO AVOID:
 *
 * ❌ Not collecting all chunks:
 *    req.on('data', chunk => {
 *      JSON.parse(chunk); // Might be incomplete!
 *    });
 *
 * ❌ Forgetting to convert Buffer to string:
 *    const body = Buffer.concat(chunks);
 *    JSON.parse(body); // Error! Need toString()
 *
 * ❌ Not handling JSON parse errors:
 *    const data = JSON.parse(bodyString); // Throws if invalid
 *
 * ❌ Not limiting body size:
 *    // Malicious client could send huge body and crash server
 *
 * ❌ Not validating input:
 *    users.push(data); // Could contain malicious data
 *
 * ❌ Not using async/await properly:
 *    const data = parseJSONBody(req); // Returns Promise!
 *    // Should use: await parseJSONBody(req)
 *
 * ❌ Forgetting Content-Type header:
 *    // Client needs to know response is JSON
 */

/**
 * GOING FURTHER:
 *
 * Try these challenges:
 * 1. Add PUT /users/:id endpoint to update users
 * 2. Add DELETE /users/:id endpoint to delete users
 * 3. Implement pagination for GET /users
 * 4. Add filtering (e.g., /users?age=30)
 * 5. Add sorting (e.g., /users?sort=name)
 * 6. Implement PATCH for partial updates
 * 7. Add validation for email format (regex)
 * 8. Implement authentication (API keys)
 * 9. Add timestamps (createdAt, updatedAt)
 * 10. Persist data to a JSON file
 * 11. Add request logging middleware
 * 12. Implement field projection (return only specific fields)
 */
