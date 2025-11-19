/**
 * Example 6: URL Manipulation Patterns
 *
 * Advanced patterns for manipulating query strings in URLs.
 */

const querystring = require('querystring');

console.log('=== URL Manipulation Patterns ===\n');

// 1. Merging query parameters
function mergeQueryParams(url, newParams) {
  const [base, query = ''] = url.split('?');
  const current = querystring.parse(query);
  const merged = { ...current, ...newParams };
  const newQuery = querystring.stringify(merged);
  return newQuery ? `${base}?${newQuery}` : base;
}

console.log('1. Merging Parameters\n');
const url1 = '/search?q=nodejs&page=1';
console.log('Original:', url1);
console.log('Merged:', mergeQueryParams(url1, { page: 2, limit: 50 }));
console.log('');

// 2. Removing parameters
function removeQueryParams(url, keysToRemove) {
  const [base, query = ''] = url.split('?');
  const current = querystring.parse(query);
  keysToRemove.forEach(key => delete current[key]);
  const newQuery = querystring.stringify(current);
  return newQuery ? `${base}?${newQuery}` : base;
}

console.log('2. Removing Parameters\n');
console.log('Remove page:', removeQueryParams(url1, ['page']));
console.log('');

// 3. Picking specific parameters
function pickQueryParams(url, keysToPick) {
  const [base, query = ''] = url.split('?');
  const current = querystring.parse(query);
  const picked = {};
  keysToPick.forEach(key => {
    if (current[key] !== undefined) {
      picked[key] = current[key];
    }
  });
  const newQuery = querystring.stringify(picked);
  return newQuery ? `${base}?${newQuery}` : base;
}

console.log('3. Picking Parameters\n');
const url2 = '/api/data?a=1&b=2&c=3&d=4';
console.log('Pick a and c:', pickQueryParams(url2, ['a', 'c']));
console.log('');

// 4. URL builder class
class UrlManipulator {
  constructor(url = '') {
    const [base, query = ''] = url.split('?');
    this.base = base;
    this.params = querystring.parse(query);
  }

  set(key, value) {
    this.params[key] = value;
    return this;
  }

  delete(key) {
    delete this.params[key];
    return this;
  }

  get(key) {
    return this.params[key];
  }

  merge(obj) {
    Object.assign(this.params, obj);
    return this;
  }

  clear() {
    this.params = {};
    return this;
  }

  toString() {
    const query = querystring.stringify(this.params);
    return query ? `${this.base}?${query}` : this.base;
  }
}

console.log('4. URL Manipulator Class\n');
const manipulator = new UrlManipulator('/products?category=electronics');
const result = manipulator
  .set('page', 2)
  .set('limit', 50)
  .delete('category')
  .merge({ sort: 'price', order: 'asc' })
  .toString();
console.log('Result:', result);
console.log('');

// 5. Query string transformations
const transformations = {
  addDefaults(url, defaults) {
    const [base, query = ''] = url.split('?');
    const params = { ...defaults, ...querystring.parse(query) };
    return `${base}?${querystring.stringify(params)}`;
  },

  cleanEmpty(url) {
    const [base, query = ''] = url.split('?');
    const params = querystring.parse(query);
    const cleaned = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== '' && v != null)
    );
    const newQuery = querystring.stringify(cleaned);
    return newQuery ? `${base}?${newQuery}` : base;
  },

  lowercase(url) {
    const [base, query = ''] = url.split('?');
    return query ? `${base}?${query.toLowerCase()}` : base;
  }
};

console.log('5. Transformations\n');
const testUrl = '/page?a=1&b=';
console.log('Add defaults:', transformations.addDefaults(testUrl, { page: 1, limit: 20 }));
console.log('Clean empty:', transformations.cleanEmpty(testUrl));
console.log('');

// 6. Pagination helpers
console.log('6. Pagination Helpers\n');

function buildPaginationUrls(baseUrl, currentPage, totalPages, existingParams = {}) {
  const buildUrl = (page) => {
    const params = { ...existingParams, page };
    const query = querystring.stringify(params);
    return `${baseUrl}?${query}`;
  };

  return {
    first: currentPage > 1 ? buildUrl(1) : null,
    prev: currentPage > 1 ? buildUrl(currentPage - 1) : null,
    current: buildUrl(currentPage),
    next: currentPage < totalPages ? buildUrl(currentPage + 1) : null,
    last: currentPage < totalPages ? buildUrl(totalPages) : null
  };
}

const pagination = buildPaginationUrls('/products', 5, 10, { category: 'electronics', sort: 'price' });
console.log('Pagination URLs:');
console.log('  First:', pagination.first);
console.log('  Prev:', pagination.prev);
console.log('  Current:', pagination.current);
console.log('  Next:', pagination.next);
console.log('  Last:', pagination.last);
console.log('');

// 7. URL comparison
console.log('7. URL Comparison\n');

function compareQueryStrings(url1, url2) {
  const params1 = querystring.parse(url1.split('?')[1] || '');
  const params2 = querystring.parse(url2.split('?')[1] || '');

  const keys1 = Object.keys(params1).sort();
  const keys2 = Object.keys(params2).sort();

  if (JSON.stringify(keys1) !== JSON.stringify(keys2)) {
    return false;
  }

  return keys1.every(key => params1[key] === params2[key]);
}

console.log('Compare URLs:');
console.log('/page?a=1&b=2 === /page?b=2&a=1:', compareQueryStrings('/page?a=1&b=2', '/page?b=2&a=1'));
console.log('/page?a=1&b=2 === /page?a=1&b=3:', compareQueryStrings('/page?a=1&b=2', '/page?a=1&b=3'));
console.log('');

// 8. URL normalization
console.log('8. URL Normalization\n');

function normalizeUrl(url) {
  const [base, query = ''] = url.split('?');
  const params = querystring.parse(query);

  // Sort keys for consistent output
  const sorted = Object.keys(params).sort().reduce((acc, key) => {
    acc[key] = params[key];
    return acc;
  }, {});

  const normalized = querystring.stringify(sorted);
  return normalized ? `${base}?${normalized}` : base;
}

console.log('Original: /search?z=3&a=1&m=2');
console.log('Normalized:', normalizeUrl('/search?z=3&a=1&m=2'));
console.log('');

console.log('=== Best Practices ===');
console.log('✓ Use helper functions for common operations');
console.log('✓ Preserve existing parameters when merging');
console.log('✓ Handle missing query strings gracefully');
console.log('✓ Build utilities for your specific needs');
console.log('✓ Test edge cases thoroughly');
console.log('✓ Normalize URLs for comparison');
console.log('✓ Use classes for complex manipulations');
