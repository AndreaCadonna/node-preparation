/**
 * Exercise 4 Solutions: Building URLs
 */

const querystring = require('querystring');

console.log('=== Exercise 4 Solutions ===\n');

// Task 1: Simple URL builder
console.log('Task 1: Build URL with parameters');
function buildSearchUrl(searchTerm, page = 1) {
  const params = { q: searchTerm, page };
  return `/search?${querystring.stringify(params)}`;
}

console.log('buildSearchUrl("nodejs", 2):');
console.log('Result:', buildSearchUrl('nodejs', 2));
console.log('Expected: /search?q=nodejs&page=2');
console.log('✓ Task 1 complete\n');

// Task 2: URL builder with optional parameters
console.log('Task 2: Build URL with optional filters');
function buildProductUrl(filters) {
  const params = {};

  // Only include non-empty filters
  if (filters.category) params.category = filters.category;
  if (filters.minPrice) params.minPrice = filters.minPrice;
  if (filters.maxPrice) params.maxPrice = filters.maxPrice;
  if (filters.sort) params.sort = filters.sort;

  const queryStr = querystring.stringify(params);
  return queryStr ? `/products?${queryStr}` : '/products';
}

console.log('With filters { category: "books", sort: "price" }:');
console.log('Result:', buildProductUrl({ category: 'books', sort: 'price' }));
console.log('');

console.log('Without filters {}:');
console.log('Result:', buildProductUrl({}));
console.log('Expected: /products (no query string)');
console.log('✓ Task 2 complete\n');

// Task 3: Pagination URL builder
console.log('Task 3: Generate pagination URLs');
function buildPaginationUrl(baseUrl, currentPage, params = {}) {
  const allParams = { ...params, page: currentPage };
  return `${baseUrl}?${querystring.stringify(allParams)}`;
}

console.log('buildPaginationUrl("/products", 3, { category: "electronics" }):');
console.log('Result:', buildPaginationUrl('/products', 3, { category: 'electronics' }));
console.log('Expected: /products?category=electronics&page=3');
console.log('✓ Task 3 complete\n');

// Additional examples
console.log('Additional Examples:\n');

// Advanced URL builder class
console.log('Advanced URL builder class:');
class UrlBuilder {
  constructor(basePath) {
    this.basePath = basePath;
    this.params = {};
  }

  addParam(key, value) {
    if (value !== null && value !== undefined && value !== '') {
      this.params[key] = value;
    }
    return this; // Enable chaining
  }

  addParams(params) {
    Object.entries(params).forEach(([key, value]) => {
      this.addParam(key, value);
    });
    return this;
  }

  removeParam(key) {
    delete this.params[key];
    return this;
  }

  build() {
    const queryStr = querystring.stringify(this.params);
    return queryStr ? `${this.basePath}?${queryStr}` : this.basePath;
  }
}

const url1 = new UrlBuilder('/search')
  .addParam('q', 'nodejs')
  .addParam('page', 1)
  .addParam('limit', 20)
  .build();
console.log('Chained builder:', url1);
console.log('');

// Filter builder
console.log('Smart filter builder:');
function buildFilterUrl(baseUrl, filters) {
  const params = {};

  // Handle different filter types
  if (filters.search) params.q = filters.search;
  if (filters.category) params.category = filters.category;

  // Price range
  if (filters.minPrice !== undefined && filters.minPrice !== null) {
    params.minPrice = filters.minPrice;
  }
  if (filters.maxPrice !== undefined && filters.maxPrice !== null) {
    params.maxPrice = filters.maxPrice;
  }

  // Arrays
  if (filters.tags && filters.tags.length > 0) {
    params.tag = filters.tags;
  }

  // Booleans
  if (filters.inStock !== undefined) {
    params.inStock = filters.inStock ? '1' : '0';
  }

  // Sorting
  if (filters.sortBy) params.sort = filters.sortBy;
  if (filters.order) params.order = filters.order;

  // Pagination
  if (filters.page) params.page = filters.page;
  if (filters.limit) params.limit = filters.limit;

  const queryStr = querystring.stringify(params);
  return queryStr ? `${baseUrl}?${queryStr}` : baseUrl;
}

const complexFilter = buildFilterUrl('/products', {
  search: 'laptop',
  category: 'electronics',
  minPrice: 500,
  maxPrice: 2000,
  tags: ['gaming', 'portable'],
  inStock: true,
  sortBy: 'price',
  order: 'asc',
  page: 1,
  limit: 50
});
console.log('Complex filter URL:', complexFilter);
console.log('');

// URL updater
console.log('URL parameter updater:');
function updateUrlParams(currentUrl, updates) {
  // Extract current params
  const questionIndex = currentUrl.indexOf('?');
  const basePath = questionIndex === -1 ? currentUrl : currentUrl.substring(0, questionIndex);
  const queryStr = questionIndex === -1 ? '' : currentUrl.substring(questionIndex + 1);

  // Parse and merge
  const currentParams = querystring.parse(queryStr);
  const mergedParams = { ...currentParams, ...updates };

  // Build new URL
  const newQueryStr = querystring.stringify(mergedParams);
  return newQueryStr ? `${basePath}?${newQueryStr}` : basePath;
}

const currentUrl = '/search?q=nodejs&page=1&limit=20';
const updatedUrl = updateUrlParams(currentUrl, { page: 5, sort: 'date' });
console.log('Current:', currentUrl);
console.log('Updated:', updatedUrl);
console.log('');

console.log('=== All Tasks Complete! ===');
