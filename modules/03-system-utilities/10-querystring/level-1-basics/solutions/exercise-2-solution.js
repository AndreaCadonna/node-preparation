/**
 * Exercise 2 Solutions: URL Encoding
 */

const querystring = require('querystring');

console.log('=== Exercise 2 Solutions ===\n');

// Task 1: Encode special characters
console.log('Task 1: Encode a string for URL');
function encodeForUrl(str) {
  return querystring.escape(str);
}

console.log('Input: "Hello World!"');
console.log('Output:', encodeForUrl('Hello World!'));
console.log('Expected: Hello%20World!');
console.log('✓ Task 1 complete\n');

// Task 2: Decode URL-encoded string
console.log('Task 2: Decode URL-encoded string');
function decodeFromUrl(str) {
  return querystring.unescape(str);
}

console.log('Input: "user%40example.com"');
console.log('Output:', decodeFromUrl('user%40example.com'));
console.log('Expected: user@example.com');
console.log('✓ Task 2 complete\n');

// Task 3: Build URL with special characters
console.log('Task 3: Build safe URL with special characters');
function buildSafeUrl(path, params) {
  const queryStr = querystring.stringify(params);
  return queryStr ? `${path}?${queryStr}` : path;
}

const url = buildSafeUrl('/search', {
  q: 'Node.js & Express',
  email: 'user@example.com'
});
console.log('Output:', url);
console.log('Should properly encode & and @');
console.log('Contains %26 (encoded &):', url.includes('%26'));
console.log('Contains %40 (encoded @):', url.includes('%40'));
console.log('✓ Task 3 complete\n');

// Additional demonstrations
console.log('Additional Examples:\n');

// Example 1: Various special characters
console.log('Example 1: Encoding various characters');
const specialChars = {
  ampersand: 'Tom & Jerry',
  at: 'user@example.com',
  hash: '#nodejs',
  question: 'What is this?',
  equals: '2+2=4',
  space: 'Hello World'
};

const encoded = querystring.stringify(specialChars);
console.log('Encoded:', encoded);
console.log('');

// Example 2: Round-trip encoding
console.log('Example 2: Round-trip encoding');
const original = 'Hello World! user@example.com & friends';
const step1 = querystring.escape(original);
const step2 = querystring.unescape(step1);
console.log('Original:', original);
console.log('Encoded:', step1);
console.log('Decoded:', step2);
console.log('Match:', original === step2);
console.log('');

// Example 3: Building search URLs safely
console.log('Example 3: Safe search URL builder');
function buildSearchUrl(query, filters = {}) {
  const params = { q: query, ...filters };
  return `/search?${querystring.stringify(params)}`;
}

console.log('Search "C++ programming":', buildSearchUrl('C++ programming'));
console.log('Search with filters:', buildSearchUrl('Node.js & Express', { category: 'tutorials' }));
console.log('');

console.log('=== All Tasks Complete! ===');
