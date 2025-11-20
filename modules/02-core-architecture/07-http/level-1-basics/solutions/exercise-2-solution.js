/**
 * Exercise 2 Solution: Query Parameters
 *
 * This solution demonstrates:
 * - Parsing URL query parameters
 * - Using the url module to parse URLs
 * - Implementing parameter defaults
 * - Input validation for query parameters
 * - Building a calculator API endpoint
 * - Proper error responses with status codes
 */

const http = require('http');
const url = require('url');

console.log('=== Exercise 2: Query Parameters ===\n');

// Task 1: Create a greeting endpoint
/**
 * Create GET /greet endpoint that:
 * - Accepts query parameters: name and language
 * - Returns greeting in specified language
 * - Defaults: name="Guest", language="en"
 *
 * Approach:
 * - Use url.parse(req.url, true) to parse URL and query string
 * - The 'true' parameter automatically parses query string into an object
 * - Use default values with || operator or destructuring
 * - Implement a language map for different greetings
 */

// Define greetings in multiple languages
const greetings = {
  en: 'Hello',
  es: 'Hola',
  fr: 'Bonjour',
  de: 'Guten Tag',
  it: 'Ciao',
  pt: 'Olá',
  ja: 'こんにちは',
  zh: '你好',
  ru: 'Привет'
};

/**
 * Handle /greet endpoint
 * @param {object} query - Parsed query parameters
 * @param {ServerResponse} res - Response object
 */
function handleGreet(query, res) {
  // Extract parameters with defaults
  // query.name will be undefined if not provided, so we use || to provide default
  const name = query.name || 'Guest';
  const language = query.language || 'en';

  // Get the greeting for the specified language
  // If language is not supported, default to English
  const greeting = greetings[language] || greetings.en;

  // Build the response message
  const message = `${greeting}, ${name}!`;

  // If language is not supported, include a note
  let response = message;
  if (!greetings[language]) {
    response += `\n\nNote: Language '${language}' is not supported. Using English instead.`;
    response += `\n\nSupported languages: ${Object.keys(greetings).join(', ')}`;
  }

  // Send successful response
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8'); // utf-8 for international characters
  res.end(response);
}

// Task 2: Create a calculator endpoint
/**
 * Create GET /calculate endpoint that:
 * - Accepts query parameters: a, b, operation
 * - Performs calculation (add, subtract, multiply, divide)
 * - Returns result as JSON
 * - Handles invalid input with 400 error
 *
 * Approach:
 * - Validate that all required parameters are present
 * - Parse string parameters to numbers
 * - Validate that numbers are valid (not NaN)
 * - Implement each operation with proper error handling
 * - Return JSON response with result or error
 */

/**
 * Handle /calculate endpoint
 * @param {object} query - Parsed query parameters
 * @param {ServerResponse} res - Response object
 */
function handleCalculate(query, res) {
  // Extract parameters
  const { a, b, operation } = query;

  // Validate that all required parameters are present
  if (!a || !b || !operation) {
    res.statusCode = 400; // Bad Request
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'Missing parameters',
      message: 'Required parameters: a, b, operation',
      example: '/calculate?a=10&b=5&operation=add'
    }, null, 2));
    return;
  }

  // Parse string parameters to numbers
  // parseFloat handles integers and decimals
  const numA = parseFloat(a);
  const numB = parseFloat(b);

  // Validate that parameters are valid numbers
  if (isNaN(numA) || isNaN(numB)) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'Invalid number',
      message: 'Parameters a and b must be valid numbers',
      received: { a, b }
    }, null, 2));
    return;
  }

  // Perform the calculation based on operation
  let result;
  let operationSymbol;

  switch (operation.toLowerCase()) {
    case 'add':
    case 'addition':
    case 'plus':
      result = numA + numB;
      operationSymbol = '+';
      break;

    case 'subtract':
    case 'subtraction':
    case 'minus':
      result = numA - numB;
      operationSymbol = '-';
      break;

    case 'multiply':
    case 'multiplication':
    case 'times':
      result = numA * numB;
      operationSymbol = '×';
      break;

    case 'divide':
    case 'division':
      // Handle division by zero
      if (numB === 0) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          error: 'Division by zero',
          message: 'Cannot divide by zero'
        }, null, 2));
        return;
      }
      result = numA / numB;
      operationSymbol = '÷';
      break;

    default:
      // Invalid operation
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        error: 'Invalid operation',
        message: `Operation '${operation}' is not supported`,
        supported: ['add', 'subtract', 'multiply', 'divide']
      }, null, 2));
      return;
  }

  // Send successful response with result
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    operation: operation,
    expression: `${numA} ${operationSymbol} ${numB}`,
    result: result,
    // Include extra information
    inputs: {
      a: numA,
      b: numB
    }
  }, null, 2));
}

// Create the HTTP server
const server = http.createServer((req, res) => {
  // Parse the URL with query parameters
  // The 'true' parameter tells url.parse to parse the query string
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  // Log incoming request
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

  // Only handle GET requests
  if (req.method !== 'GET') {
    res.statusCode = 405; // Method Not Allowed
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Allow', 'GET'); // Tell client which methods are allowed
    res.end(JSON.stringify({
      error: 'Method not allowed',
      message: `${req.method} is not supported. Use GET.`
    }, null, 2));
    return;
  }

  // Route: GET /greet
  if (pathname === '/greet') {
    handleGreet(query, res);
  }

  // Route: GET /calculate
  else if (pathname === '/calculate') {
    handleCalculate(query, res);
  }

  // Route: GET / - Documentation/Help
  else if (pathname === '/') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end(`Query Parameters API
===================

Available Endpoints:

1. GET /greet
   Parameters:
   - name (optional, default: "Guest") - Your name
   - language (optional, default: "en") - Language code

   Examples:
   - /greet?name=Alice
   - /greet?name=Bob&language=es
   - /greet?language=fr

   Supported languages: ${Object.keys(greetings).join(', ')}

2. GET /calculate
   Parameters:
   - a (required) - First number
   - b (required) - Second number
   - operation (required) - add, subtract, multiply, divide

   Examples:
   - /calculate?a=10&b=5&operation=add
   - /calculate?a=20&b=4&operation=divide
   - /calculate?a=7&b=3&operation=multiply

Try it with curl:
  curl "http://localhost:3000/greet?name=Alice&language=es"
  curl "http://localhost:3000/calculate?a=10&b=5&operation=add"
`);
  }

  // Handle 404
  else {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'Not found',
      message: `Endpoint '${pathname}' does not exist`,
      availableEndpoints: ['/', '/greet', '/calculate']
    }, null, 2));
  }
});

const PORT = 3000;

server.listen(PORT, () => {
  console.log(`✓ Server running at http://localhost:${PORT}/\n`);
  console.log('Try these commands:');
  console.log('  curl "http://localhost:3000/"');
  console.log('  curl "http://localhost:3000/greet?name=Alice&language=en"');
  console.log('  curl "http://localhost:3000/greet?name=Bob&language=es"');
  console.log('  curl "http://localhost:3000/calculate?a=10&b=5&operation=add"');
  console.log('  curl "http://localhost:3000/calculate?a=10&b=5&operation=divide"');
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
    process.exit(0);
  });
});

/**
 * Testing:
 * curl "http://localhost:3000/greet?name=Alice&language=en"
 * curl "http://localhost:3000/greet?name=Bob&language=es"
 * curl "http://localhost:3000/greet?name=Charlie&language=fr"
 * curl "http://localhost:3000/greet"
 * curl "http://localhost:3000/greet?language=de"
 * curl "http://localhost:3000/calculate?a=10&b=5&operation=add"
 * curl "http://localhost:3000/calculate?a=10&b=5&operation=subtract"
 * curl "http://localhost:3000/calculate?a=10&b=5&operation=multiply"
 * curl "http://localhost:3000/calculate?a=10&b=5&operation=divide"
 * curl "http://localhost:3000/calculate?a=10&b=0&operation=divide"
 * curl "http://localhost:3000/calculate?a=10&operation=add"
 */

/**
 * KEY LEARNING POINTS:
 *
 * 1. URL Parsing:
 *    - url.parse(urlString, parseQueryString) parses a URL
 *    - Second parameter 'true' parses query string into an object
 *    - parsedUrl.pathname contains the path (e.g., '/greet')
 *    - parsedUrl.query contains query parameters as an object
 *
 * 2. Query Parameters:
 *    - Format: /path?key1=value1&key2=value2
 *    - All values are strings by default
 *    - Need to parse numbers with parseInt() or parseFloat()
 *    - Use || operator for default values
 *
 * 3. Input Validation:
 *    - Always validate required parameters are present
 *    - Check that numbers are valid (not NaN)
 *    - Validate operation/option against allowed values
 *    - Return 400 Bad Request for invalid input
 *
 * 4. Error Responses:
 *    - 400 Bad Request - client error (invalid parameters)
 *    - 404 Not Found - resource doesn't exist
 *    - 405 Method Not Allowed - wrong HTTP method
 *    - Include helpful error messages in response
 *
 * 5. JSON Responses:
 *    - Always set Content-Type: application/json
 *    - Use JSON.stringify() to convert objects
 *    - Use null, 2 parameters for pretty printing
 *    - Include both data and metadata
 *
 * 6. Parameter Defaults:
 *    - Use || operator: query.name || 'Guest'
 *    - Or destructuring: const {name = 'Guest'} = query
 *    - Document defaults in API documentation
 */

/**
 * COMMON MISTAKES TO AVOID:
 *
 * ❌ Forgetting to parse query string:
 *    const parsed = url.parse(req.url); // query is a string!
 *    // Should be: url.parse(req.url, true)
 *
 * ❌ Not validating number parameters:
 *    const result = query.a + query.b; // String concatenation!
 *    // Should parse: parseFloat(query.a)
 *
 * ❌ Not checking for NaN:
 *    const num = parseFloat('abc'); // NaN
 *    const result = num * 2; // NaN
 *
 * ❌ Not handling division by zero:
 *    const result = 10 / 0; // Infinity
 *
 * ❌ Forgetting URL encoding:
 *    // Spaces and special characters must be encoded
 *    // "Hello World" becomes "Hello%20World"
 *
 * ❌ Not setting proper Content-Type:
 *    res.end(JSON.stringify({data})); // Client may not parse as JSON
 */

/**
 * GOING FURTHER:
 *
 * Try these challenges:
 * 1. Add support for multiple operations in one request
 * 2. Implement a temperature converter (C to F, F to C)
 * 3. Add unit conversion endpoint (miles/km, lbs/kg, etc.)
 * 4. Create a text manipulation endpoint (uppercase, reverse, etc.)
 * 5. Add request rate limiting
 * 6. Implement parameter validation middleware
 * 7. Add support for arrays in query parameters
 * 8. Create an endpoint that returns random data based on parameters
 * 9. Add calculation history tracking
 * 10. Implement more complex math operations (power, sqrt, etc.)
 */
