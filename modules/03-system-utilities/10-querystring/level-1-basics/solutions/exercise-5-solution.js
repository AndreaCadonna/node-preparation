/**
 * Exercise 5 Solutions: Search Functionality
 */

const querystring = require('querystring');

console.log('=== Exercise 5 Solutions ===\n');

// Helper functions for type conversion
function toInt(value, defaultValue = 0) {
  const num = parseInt(value, 10);
  return isNaN(num) ? defaultValue : num;
}

function toArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

// Task 1: Parse search query
console.log('Task 1: Parse search parameters');
function parseSearchQuery(queryStr) {
  const params = querystring.parse(queryStr);

  return {
    query: params.q || '',
    page: toInt(params.page, 1),
    limit: toInt(params.limit, 20),
    sort: params.sort || 'relevance',
    filters: toArray(params.filter)
  };
}

const result1 = parseSearchQuery('q=nodejs&page=2&limit=50&sort=date&filter=tutorial&filter=free');
console.log('Input: q=nodejs&page=2&limit=50&sort=date&filter=tutorial&filter=free');
console.log('Result:', result1);
console.log('');
console.log('Types check:');
console.log('  query:', typeof result1.query, '✓');
console.log('  page:', typeof result1.page, '(number) ✓');
console.log('  limit:', typeof result1.limit, '(number) ✓');
console.log('  sort:', typeof result1.sort, '✓');
console.log('  filters:', Array.isArray(result1.filters) ? 'array ✓' : 'not array');
console.log('✓ Task 1 complete\n');

// Task 2: Build search URL
console.log('Task 2: Build search URL from config');
function buildSearchQuery(config) {
  const params = {
    q: config.query
  };

  if (config.page && config.page !== 1) params.page = config.page;
  if (config.limit && config.limit !== 20) params.limit = config.limit;
  if (config.sort && config.sort !== 'relevance') params.sort = config.sort;
  if (config.filters && config.filters.length > 0) {
    params.filter = config.filters;
  }

  return querystring.stringify(params);
}

const config = {
  query: 'javascript tutorial',
  page: 1,
  limit: 20,
  sort: 'date',
  filters: ['beginner', 'free']
};

const url = buildSearchQuery(config);
console.log('Config:', config);
console.log('Result:', url);
console.log('✓ Task 2 complete\n');

// Task 3: Update search query
console.log('Task 3: Update existing search URL');
function updateSearchUrl(currentUrl, updates) {
  // Extract query part
  const questionIndex = currentUrl.indexOf('?');
  const basePath = questionIndex === -1 ? currentUrl : currentUrl.substring(0, questionIndex);
  const queryStr = questionIndex === -1 ? '' : currentUrl.substring(questionIndex + 1);

  // Parse current params
  const currentParams = querystring.parse(queryStr);

  // Merge updates
  const mergedParams = { ...currentParams, ...updates };

  // Rebuild URL
  const newQueryStr = querystring.stringify(mergedParams);
  return newQueryStr ? `${basePath}?${newQueryStr}` : basePath;
}

const current = '/search?q=nodejs&page=1';
const updated = updateSearchUrl(current, { page: 2, limit: 50 });
console.log('Current:', current);
console.log('Updates: { page: 2, limit: 50 }');
console.log('Result:', updated);
console.log('Should preserve q, update page, add limit ✓');
console.log('✓ Task 3 complete\n');

// Additional comprehensive search system
console.log('Additional: Complete Search System\n');

class SearchManager {
  constructor(baseUrl = '/search') {
    this.baseUrl = baseUrl;
  }

  // Parse search URL to config
  parseUrl(url) {
    const questionIndex = url.indexOf('?');
    if (questionIndex === -1) {
      return this.getDefaultConfig();
    }

    const queryStr = url.substring(questionIndex + 1);
    const params = querystring.parse(queryStr);

    return {
      query: params.q || '',
      page: toInt(params.page, 1),
      limit: Math.min(toInt(params.limit, 20), 100), // Max 100
      sort: params.sort || 'relevance',
      order: params.order || 'desc',
      filters: {
        categories: toArray(params.category),
        tags: toArray(params.tag),
        dateRange: params.dateRange || 'all',
        minRating: toInt(params.minRating, 0)
      }
    };
  }

  // Build search URL from config
  buildUrl(config) {
    const params = {};

    // Required
    if (config.query) params.q = config.query;

    // Optional with defaults
    if (config.page && config.page > 1) params.page = config.page;
    if (config.limit && config.limit !== 20) params.limit = config.limit;
    if (config.sort && config.sort !== 'relevance') params.sort = config.sort;
    if (config.order && config.order !== 'desc') params.order = config.order;

    // Filters
    if (config.filters) {
      if (config.filters.categories && config.filters.categories.length > 0) {
        params.category = config.filters.categories;
      }
      if (config.filters.tags && config.filters.tags.length > 0) {
        params.tag = config.filters.tags;
      }
      if (config.filters.dateRange && config.filters.dateRange !== 'all') {
        params.dateRange = config.filters.dateRange;
      }
      if (config.filters.minRating && config.filters.minRating > 0) {
        params.minRating = config.filters.minRating;
      }
    }

    const queryStr = querystring.stringify(params);
    return queryStr ? `${this.baseUrl}?${queryStr}` : this.baseUrl;
  }

  // Get default config
  getDefaultConfig() {
    return {
      query: '',
      page: 1,
      limit: 20,
      sort: 'relevance',
      order: 'desc',
      filters: {
        categories: [],
        tags: [],
        dateRange: 'all',
        minRating: 0
      }
    };
  }

  // Update specific parameters
  updateConfig(currentConfig, updates) {
    return {
      ...currentConfig,
      ...updates,
      filters: {
        ...currentConfig.filters,
        ...(updates.filters || {})
      }
    };
  }

  // Build pagination URLs
  getPaginationUrls(config, totalPages) {
    const { page } = config;

    return {
      first: page > 1 ? this.buildUrl({ ...config, page: 1 }) : null,
      prev: page > 1 ? this.buildUrl({ ...config, page: page - 1 }) : null,
      current: this.buildUrl(config),
      next: page < totalPages ? this.buildUrl({ ...config, page: page + 1 }) : null,
      last: page < totalPages ? this.buildUrl({ ...config, page: totalPages }) : null
    };
  }
}

// Test the complete system
const searchMgr = new SearchManager();

console.log('1. Parse complex URL:');
const complexUrl = '/search?q=nodejs+tutorial&page=3&limit=50&category=programming&category=web&tag=beginner&sort=date&minRating=4';
const parsedConfig = searchMgr.parseUrl(complexUrl);
console.log('Parsed:', JSON.stringify(parsedConfig, null, 2));
console.log('');

console.log('2. Build URL from config:');
const newConfig = {
  query: 'react hooks',
  page: 1,
  limit: 25,
  sort: 'popularity',
  order: 'desc',
  filters: {
    categories: ['frontend', 'javascript'],
    tags: ['tutorial', 'advanced'],
    dateRange: 'month',
    minRating: 4
  }
};
const builtUrl = searchMgr.buildUrl(newConfig);
console.log('Built URL:', builtUrl);
console.log('');

console.log('3. Update configuration:');
const updatedConfig = searchMgr.updateConfig(parsedConfig, {
  page: 5,
  sort: 'relevance',
  filters: { minRating: 5 }
});
console.log('Updated config:', JSON.stringify(updatedConfig, null, 2));
console.log('');

console.log('4. Generate pagination URLs:');
const paginationUrls = searchMgr.getPaginationUrls(parsedConfig, 10);
console.log('Pagination:');
console.log('  First:', paginationUrls.first);
console.log('  Prev:', paginationUrls.prev);
console.log('  Current:', paginationUrls.current);
console.log('  Next:', paginationUrls.next);
console.log('  Last:', paginationUrls.last);
console.log('');

console.log('=== All Tasks Complete! ===');
console.log('\nThis comprehensive search system demonstrates:');
console.log('✓ URL parsing and building');
console.log('✓ Type conversion and validation');
console.log('✓ Default value handling');
console.log('✓ Filter management');
console.log('✓ Pagination URL generation');
console.log('✓ Configuration updates');
