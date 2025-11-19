/**
 * Exercise 3 Solutions: Type Conversion
 */

const querystring = require('querystring');

console.log('=== Exercise 3 Solutions ===\n');

// Task 1: Parse and convert to integers
console.log('Task 1: Convert to integers safely');
function parseIntParam(queryStr, key, defaultValue = 0) {
  const params = querystring.parse(queryStr);
  const value = params[key];

  if (value === undefined || value === null) {
    return defaultValue;
  }

  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

console.log('Parse "page=5&limit=20", key "page", default 1:');
console.log('Result:', parseIntParam('page=5&limit=20', 'page', 1));
console.log('Expected: 5\n');

console.log('Parse "page=abc", key "page", default 1:');
console.log('Result:', parseIntParam('page=abc', 'page', 1));
console.log('Expected: 1 (default)\n');

console.log('✓ Task 1 complete\n');

// Task 2: Parse booleans
console.log('Task 2: Convert to booleans');
function parseBoolParam(queryStr, key, defaultValue = false) {
  const params = querystring.parse(queryStr);
  const value = params[key];

  if (value === undefined || value === null) {
    return defaultValue;
  }

  return value === 'true' || value === '1';
}

console.log('Parse "active=true", key "active":');
console.log('Result:', parseBoolParam('active=true', 'active'));
console.log('Expected: true\n');

console.log('Parse "active=false", key "active":');
console.log('Result:', parseBoolParam('active=false', 'active'));
console.log('Expected: false\n');

console.log('Parse "premium=1", key "premium":');
console.log('Result:', parseBoolParam('premium=1', 'premium'));
console.log('Expected: true\n');

console.log('✓ Task 2 complete\n');

// Task 3: Create typed parameter parser
console.log('Task 3: Parse all parameters with types');
function parseTypedParams(queryStr) {
  const params = querystring.parse(queryStr);

  return {
    page: parseInt(params.page, 10) || 1,
    limit: parseInt(params.limit, 10) || 20,
    active: params.active === 'true' || params.active === '1',
    sort: params.sort || 'date'
  };
}

const result = parseTypedParams('page=2&limit=50&active=true&sort=price');
console.log('Input: "page=2&limit=50&active=true&sort=price"');
console.log('Result:', result);
console.log('Types:');
console.log('  page:', typeof result.page, '(should be number)');
console.log('  limit:', typeof result.limit, '(should be number)');
console.log('  active:', typeof result.active, '(should be boolean)');
console.log('  sort:', typeof result.sort, '(should be string)');
console.log('✓ Task 3 complete\n');

// Additional helper functions
console.log('Additional Examples:\n');

// Complete type conversion utilities
console.log('Complete type conversion utilities:');

function toInt(value, defaultValue = 0) {
  const num = parseInt(value, 10);
  return isNaN(num) ? defaultValue : num;
}

function toFloat(value, defaultValue = 0.0) {
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
}

function toBool(value, defaultValue = false) {
  if (value === undefined || value === null) return defaultValue;
  return value === 'true' || value === '1';
}

function toArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

// Test the utilities
const testParams = querystring.parse('page=5&price=29.99&active=true&tags=a&tags=b');
console.log('Test params:', testParams);
console.log('Converted:');
console.log('  page:', toInt(testParams.page, 1));
console.log('  price:', toFloat(testParams.price, 0));
console.log('  active:', toBool(testParams.active, false));
console.log('  tags:', toArray(testParams.tags));
console.log('');

// Real-world example
console.log('Real-world example: Search parameter parser');
function parseSearchParams(queryStr) {
  const raw = querystring.parse(queryStr);

  return {
    query: raw.q || '',
    page: toInt(raw.page, 1),
    limit: Math.min(toInt(raw.limit, 20), 100), // Max 100
    sort: raw.sort || 'relevance',
    filters: toArray(raw.filter),
    includeArchived: toBool(raw.archived, false),
    minPrice: toFloat(raw.minPrice, 0),
    maxPrice: toFloat(raw.maxPrice, Number.MAX_VALUE)
  };
}

const search1 = parseSearchParams('q=nodejs&page=3&limit=50&filter=tutorial&filter=free&archived=true&minPrice=0&maxPrice=99.99');
console.log('Parsed search params:', search1);
console.log('');

const search2 = parseSearchParams('q=javascript');
console.log('Parsed with defaults:', search2);
console.log('');

console.log('=== All Tasks Complete! ===');
