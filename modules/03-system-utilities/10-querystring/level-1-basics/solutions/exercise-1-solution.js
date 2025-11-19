/**
 * Exercise 1 Solutions: Basic Parsing and Stringifying
 */

const querystring = require('querystring');

console.log('=== Exercise 1 Solutions ===\n');

// Task 1: Parse a simple query string
console.log('Task 1: Parse query string to object');
function parseQuery(queryStr) {
  return querystring.parse(queryStr);
}

const query1 = 'name=John&age=30&city=NYC';
const result1 = parseQuery(query1);
console.log('Input:', query1);
console.log('Output:', result1);
console.log('✓ Task 1 complete\n');

// Task 2: Stringify an object to query string
console.log('Task 2: Object to query string');
function stringifyQuery(obj) {
  return querystring.stringify(obj);
}

const obj2 = { search: 'nodejs', category: 'tutorial', page: 1 };
const result2 = stringifyQuery(obj2);
console.log('Input:', obj2);
console.log('Output:', result2);
console.log('✓ Task 2 complete\n');

// Task 3: Extract query string from URL
console.log('Task 3: Extract and parse query from full URL');
function extractQueryFromUrl(url) {
  const questionIndex = url.indexOf('?');
  if (questionIndex === -1) {
    return {};
  }
  const queryStr = url.substring(questionIndex + 1);
  return querystring.parse(queryStr);
}

const url3 = 'https://example.com/search?q=nodejs&page=2&limit=20';
const result3 = extractQueryFromUrl(url3);
console.log('Input:', url3);
console.log('Output:', result3);
console.log('✓ Task 3 complete\n');

// Task 4: Build complete URL
console.log('Task 4: Build complete URL');
function buildUrl(basePath, params) {
  if (Object.keys(params).length === 0) {
    return basePath;
  }
  return `${basePath}?${querystring.stringify(params)}`;
}

const result4a = buildUrl('/products', { category: 'electronics', sort: 'price' });
console.log('With params:', result4a);

const result4b = buildUrl('/home', {});
console.log('Without params:', result4b);
console.log('✓ Task 4 complete\n');

// Task 5: Handle arrays in query strings
console.log('Task 5: Handle duplicate keys (arrays)');
function getQueryArray(queryStr, key) {
  const params = querystring.parse(queryStr);
  const value = params[key];

  if (value === undefined || value === null) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

const single = getQueryArray('color=red', 'color');
console.log('Single value:', single);

const multiple = getQueryArray('color=red&color=blue&color=green', 'color');
console.log('Multiple values:', multiple);

const missing = getQueryArray('size=large', 'color');
console.log('Missing key:', missing);
console.log('✓ Task 5 complete\n');

// Bonus Challenge
console.log('Bonus Challenge: Clean query parameters');
function buildCleanQuery(params) {
  const clean = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') {
      clean[key] = value;
    }
  }
  return querystring.stringify(clean);
}

const dirtyParams = {
  name: 'John',
  email: '',
  age: 30,
  phone: null,
  city: undefined,
  active: true
};

const clean = buildCleanQuery(dirtyParams);
console.log('Input:', dirtyParams);
console.log('Output:', clean);
console.log('Expected: name=John&age=30&active=true');
console.log('Match:', clean === 'name=John&age=30&active=true');
console.log('✓ Bonus complete\n');

console.log('=== All Tasks Complete! ===');
