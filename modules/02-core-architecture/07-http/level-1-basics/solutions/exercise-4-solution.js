/**
 * Exercise 4 Solution: HTTP Client
 *
 * This solution demonstrates:
 * - Making HTTP/HTTPS requests from Node.js
 * - Using http and https modules as a client
 * - Parsing URLs and handling redirects
 * - Making GET and POST requests
 * - Concurrent requests with Promise.all()
 * - Error handling for network requests
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

console.log('=== Exercise 4: HTTP Client ===\n');

// Task 1: Create a GET request wrapper
/**
 * Create a function that makes a GET request and returns a Promise
 * @param {string} urlString - Full URL to request
 * @returns {Promise<{statusCode, headers, body}>}
 *
 * Approach:
 * - Parse URL to determine if HTTP or HTTPS
 * - Use appropriate module (http or https)
 * - Collect response chunks similar to request body parsing
 * - Return Promise with complete response
 */
function httpGet(urlString) {
  return new Promise((resolve, reject) => {
    try {
      // Parse the URL
      // The URL class from Node.js url module parses URLs
      const parsedUrl = new URL(urlString);

      // Determine which module to use based on protocol
      // https: uses https module, http: uses http module
      const client = parsedUrl.protocol === 'https:' ? https : http;

      // Prepare request options
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port, // Will be null if not specified
        path: parsedUrl.pathname + parsedUrl.search, // Include query string
        method: 'GET',
        headers: {
          'User-Agent': 'Node.js HTTP Client Exercise'
        }
      };

      // Make the request
      const req = client.request(options, (res) => {
        // Array to collect response chunks
        const chunks = [];

        // Collect data chunks
        res.on('data', (chunk) => {
          chunks.push(chunk);
        });

        // Response complete
        res.on('end', () => {
          // Combine all chunks into a single Buffer
          const body = Buffer.concat(chunks).toString('utf8');

          // Resolve with response data
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        });
      });

      // Handle request errors
      // Network errors, DNS failures, connection refused, etc.
      req.on('error', (error) => {
        reject(new Error(`HTTP request failed: ${error.message}`));
      });

      // Set a timeout to prevent hanging forever
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout after 10 seconds'));
      });

      // End the request (send it)
      req.end();
    } catch (error) {
      // URL parsing error or other synchronous errors
      reject(new Error(`Invalid URL or request setup: ${error.message}`));
    }
  });
}

// Task 2: Fetch user data from JSONPlaceholder API
/**
 * Fetch user with ID 1 from: https://jsonplaceholder.typicode.com/users/1
 * Parse the JSON response
 * Log the user's name and email
 *
 * Approach:
 * - Use httpGet to fetch data
 * - Parse JSON response
 * - Extract and display relevant fields
 */
async function fetchUser(userId) {
  try {
    console.log(`Fetching user ${userId}...`);

    // Make GET request
    const response = await httpGet(`https://jsonplaceholder.typicode.com/users/${userId}`);

    // Check status code
    if (response.statusCode !== 200) {
      throw new Error(`HTTP ${response.statusCode}: Failed to fetch user`);
    }

    // Parse JSON response
    const user = JSON.parse(response.body);

    // Display user information
    console.log('✓ User fetched successfully:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Username: ${user.username}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Phone: ${user.phone}`);
    console.log(`  Website: ${user.website}`);
    console.log(`  Company: ${user.company.name}`);
    console.log(`  Address: ${user.address.city}, ${user.address.street}`);

    return user;
  } catch (error) {
    console.error('✗ Error fetching user:', error.message);
    throw error;
  }
}

// Task 3: Fetch multiple users concurrently
/**
 * Fetch users with IDs 1, 2, and 3 concurrently
 * Use Promise.all()
 * Log all users
 *
 * Approach:
 * - Create an array of promises for each user
 * - Use Promise.all() to wait for all to complete
 * - Promise.all() runs requests concurrently (in parallel)
 * - Much faster than sequential requests
 */
async function fetchMultipleUsers(userIds) {
  try {
    console.log(`Fetching ${userIds.length} users concurrently...`);

    // Record start time to measure performance
    const startTime = Date.now();

    // Create an array of promises
    // map() creates a promise for each userId
    const userPromises = userIds.map(async (userId) => {
      const response = await httpGet(`https://jsonplaceholder.typicode.com/users/${userId}`);

      if (response.statusCode !== 200) {
        throw new Error(`HTTP ${response.statusCode}: Failed to fetch user ${userId}`);
      }

      return JSON.parse(response.body);
    });

    // Wait for all promises to complete
    // Promise.all() returns when ALL promises resolve
    // If any promise rejects, Promise.all() rejects immediately
    const users = await Promise.all(userPromises);

    const duration = Date.now() - startTime;
    console.log(`✓ Fetched ${users.length} users in ${duration}ms`);

    // Display all users
    console.log('\nUsers:');
    users.forEach(user => {
      console.log(`  ${user.id}. ${user.name} (${user.email})`);
    });

    return users;
  } catch (error) {
    console.error('✗ Error fetching multiple users:', error.message);
    throw error;
  }
}

// Task 4: Make a POST request
/**
 * Create a function that makes a POST request
 * @param {string} urlString - Full URL
 * @param {object} data - Data to send
 * @returns {Promise<{statusCode, headers, body}>}
 *
 * Approach:
 * - Similar to GET but with POST method
 * - Send JSON data in request body
 * - Set Content-Type header
 * - Send Content-Length header
 */
function httpPost(urlString, data) {
  return new Promise((resolve, reject) => {
    try {
      // Parse URL
      const parsedUrl = new URL(urlString);

      // Determine client (http or https)
      const client = parsedUrl.protocol === 'https:' ? https : http;

      // Convert data to JSON string
      const postData = JSON.stringify(data);

      // Prepare request options
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData), // Important for POST
          'User-Agent': 'Node.js HTTP Client Exercise'
        }
      };

      // Make the request
      const req = client.request(options, (res) => {
        const chunks = [];

        res.on('data', (chunk) => {
          chunks.push(chunk);
        });

        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');

          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        });
      });

      // Handle errors
      req.on('error', (error) => {
        reject(new Error(`HTTP request failed: ${error.message}`));
      });

      // Set timeout
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout after 10 seconds'));
      });

      // Write POST data to request body
      req.write(postData);

      // End the request
      req.end();
    } catch (error) {
      reject(new Error(`Invalid URL or request setup: ${error.message}`));
    }
  });
}

// Task 5: Create a new post on JSONPlaceholder
/**
 * POST to: https://jsonplaceholder.typicode.com/posts
 * Send: { title: "My Post", body: "Content", userId: 1 }
 * Log the created post
 *
 * Approach:
 * - Use httpPost to send data
 * - JSONPlaceholder is a fake API that simulates creating a resource
 * - It returns the created object with an ID
 */
async function createPost(postData) {
  try {
    console.log('Creating a new post...');
    console.log('Data:', JSON.stringify(postData, null, 2));

    // Make POST request
    const response = await httpPost('https://jsonplaceholder.typicode.com/posts', postData);

    // Check status code
    // 201 Created is the standard response for successful POST
    if (response.statusCode !== 201) {
      throw new Error(`HTTP ${response.statusCode}: Failed to create post`);
    }

    // Parse response
    const createdPost = JSON.parse(response.body);

    console.log('✓ Post created successfully:');
    console.log(`  ID: ${createdPost.id}`);
    console.log(`  Title: ${createdPost.title}`);
    console.log(`  Body: ${createdPost.body}`);
    console.log(`  User ID: ${createdPost.userId}`);

    return createdPost;
  } catch (error) {
    console.error('✗ Error creating post:', error.message);
    throw error;
  }
}

// Bonus: Fetch with error handling and retry
/**
 * Enhanced GET request with retry logic
 * @param {string} url - URL to fetch
 * @param {number} maxRetries - Maximum number of retries
 * @returns {Promise<{statusCode, headers, body}>}
 */
async function httpGetWithRetry(url, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries}: ${url}`);
      const response = await httpGet(url);
      return response;
    } catch (error) {
      lastError = error;
      console.log(`  ✗ Attempt ${attempt} failed: ${error.message}`);

      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        console.log(`  Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`All ${maxRetries} attempts failed. Last error: ${lastError.message}`);
}

// Run the exercises
async function runExercises() {
  try {
    console.log('=== Starting HTTP Client Exercises ===\n');

    // Task 2: Fetch a single user
    console.log('--- Task 2: Fetch a single user ---');
    await fetchUser(1);

    console.log('\n' + '='.repeat(50) + '\n');

    // Task 3: Fetch multiple users concurrently
    console.log('--- Task 3: Fetch multiple users concurrently ---');
    await fetchMultipleUsers([1, 2, 3]);

    console.log('\n' + '='.repeat(50) + '\n');

    // Task 5: Create a post
    console.log('--- Task 5: Create a post ---');
    await createPost({
      title: 'Learning Node.js HTTP Client',
      body: 'This is my post content about HTTP requests in Node.js',
      userId: 1
    });

    console.log('\n' + '='.repeat(50) + '\n');

    // Bonus: Fetch with retry (test with invalid URL first)
    console.log('--- Bonus: Fetch with retry ---');
    try {
      // This will succeed
      const response = await httpGetWithRetry('https://jsonplaceholder.typicode.com/users/1', 2);
      console.log('✓ Fetch succeeded');
    } catch (error) {
      console.error('✗ All retries failed:', error.message);
    }

    console.log('\n=== All exercises completed! ===\n');
  } catch (error) {
    console.error('\n✗ Exercise failed:', error.message);
    process.exit(1);
  }
}

// Run all exercises
runExercises().catch(console.error);

/**
 * Testing:
 * 1. Run: node exercise-4-solution.js
 * 2. Observe the output showing:
 *    - Single user fetch
 *    - Multiple concurrent fetches
 *    - POST request creating a post
 *    - Retry logic demonstration
 *
 * Expected Output:
 * - User data from JSONPlaceholder API
 * - Multiple users fetched concurrently
 * - Created post response
 * - Timing information showing concurrent requests are faster
 */

/**
 * KEY LEARNING POINTS:
 *
 * 1. HTTP vs HTTPS:
 *    - Use http module for http:// URLs
 *    - Use https module for https:// URLs
 *    - https provides TLS/SSL encryption
 *    - Most APIs use HTTPS for security
 *
 * 2. Making Requests:
 *    - http.request(options, callback) creates a request
 *    - Request is a writable stream (for POST data)
 *    - Response is a readable stream (for response data)
 *    - Must call req.end() to send the request
 *
 * 3. URL Parsing:
 *    - URL class parses URLs into components
 *    - protocol: 'http:' or 'https:'
 *    - hostname: domain name
 *    - pathname: path component
 *    - search: query string (including ?)
 *
 * 4. Request Options:
 *    - hostname: server hostname
 *    - port: server port (80 for HTTP, 443 for HTTPS)
 *    - path: request path including query string
 *    - method: 'GET', 'POST', etc.
 *    - headers: request headers object
 *
 * 5. Response Handling:
 *    - Response arrives as chunks (stream)
 *    - Collect chunks and concatenate
 *    - Parse JSON with JSON.parse()
 *    - Check statusCode for success/error
 *
 * 6. Concurrent Requests:
 *    - Promise.all() runs promises concurrently
 *    - Much faster than sequential requests
 *    - All requests run in parallel
 *    - Waits for all to complete
 *
 * 7. POST Requests:
 *    - Set Content-Type header
 *    - Set Content-Length header
 *    - Write data to request body with req.write()
 *    - Stringify JSON data
 *
 * 8. Error Handling:
 *    - Network errors: connection refused, DNS failure
 *    - HTTP errors: 404, 500, etc.
 *    - Timeout errors
 *    - JSON parsing errors
 *    - Always handle errors in production
 */

/**
 * COMMON MISTAKES TO AVOID:
 *
 * ❌ Using http module for https URLs:
 *    http.request('https://...') // Won't work!
 *
 * ❌ Forgetting to call req.end():
 *    const req = http.request(options);
 *    // Forgot req.end() - request never sends!
 *
 * ❌ Not collecting all response chunks:
 *    res.on('data', chunk => {
 *      const data = JSON.parse(chunk); // Might be incomplete!
 *    });
 *
 * ❌ Not setting Content-Length for POST:
 *    // Some servers require Content-Length header
 *
 * ❌ Sequential vs concurrent requests:
 *    // Sequential (slow):
 *    for (const id of [1, 2, 3]) {
 *      await fetchUser(id); // Waits for each
 *    }
 *    // Concurrent (fast):
 *    await Promise.all([1, 2, 3].map(fetchUser));
 *
 * ❌ Not handling timeouts:
 *    // Request can hang forever without timeout
 *
 * ❌ Not validating status codes:
 *    const data = JSON.parse(response.body);
 *    // What if statusCode is 404 or 500?
 */

/**
 * GOING FURTHER:
 *
 * Try these challenges:
 * 1. Add support for custom headers
 * 2. Implement request/response interceptors
 * 3. Add support for redirects (301, 302)
 * 4. Implement request caching
 * 5. Add progress tracking for large requests
 * 6. Implement request queuing/throttling
 * 7. Add support for different content types
 * 8. Implement authentication (Bearer tokens, Basic auth)
 * 9. Add support for file uploads (multipart/form-data)
 * 10. Create a simple HTTP client library
 * 11. Add request/response logging
 * 12. Implement circuit breaker pattern
 *
 * Note: For production use, consider libraries like:
 * - axios: Popular HTTP client with nice API
 * - node-fetch: Fetch API for Node.js
 * - got: Powerful HTTP request library
 */
