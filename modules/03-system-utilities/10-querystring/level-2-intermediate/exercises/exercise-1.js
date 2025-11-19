/**
 * Level 2 Exercise 1: Array Parameter Handling
 *
 * Practice working with arrays in query strings using different conventions.
 */

const querystring = require('querystring');

console.log('=== Level 2 Exercise 1: Array Parameters ===\n');

// Task 1: Parse repeated keys to array
console.log('Task 1: Ensure array conversion');
function parseToArray(queryStr, key) {
  // TODO: Parse query string and ensure the specified key is always an array
  // Even if there's only one value, return it as an array
  // If key doesn't exist, return empty array
}

// Test Task 1
try {
  console.log(parseToArray('color=red', 'color')); // Should be ['red']
  console.log(parseToArray('color=red&color=blue', 'color')); // Should be ['red', 'blue']
  console.log(parseToArray('size=large', 'color')); // Should be []
  console.log('');
} catch (err) {
  console.log('Error:', err.message, '\n');
}

// Task 2: Build query with arrays
console.log('Task 2: Stringify arrays properly');
function buildQueryWithArrays(obj) {
  // TODO: Handle arrays in object, converting to repeated keys
}

// Test Task 2
try {
  const data = {
    category: 'electronics',
    brand: ['Apple', 'Samsung', 'Sony'],
    minPrice: 100
  };
  console.log(buildQueryWithArrays(data));
  // Should be: category=electronics&brand=Apple&brand=Samsung&brand=Sony&minPrice=100
  console.log('');
} catch (err) {
  console.log('Error:', err.message, '\n');
}

// Task 3: Convert comma-separated to array
console.log('Task 3: Parse comma-separated values');
function parseCommaSeparated(queryStr, arrayKeys) {
  // TODO: Parse query string and split specified keys by comma
}

// Test Task 3
try {
  console.log(parseCommaSeparated('colors=red,blue,green&size=large', ['colors']));
  // Should have colors as ['red', 'blue', 'green'] and size as 'large'
  console.log('');
} catch (err) {
  console.log('Error:', err.message, '\n');
}

console.log('Implement the functions above and test your solutions!');
