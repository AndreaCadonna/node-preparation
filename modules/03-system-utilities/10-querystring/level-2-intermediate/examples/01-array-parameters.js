/**
 * Example 1: Array Parameter Handling
 *
 * Demonstrates different conventions for handling array parameters
 * in query strings and when to use each approach.
 */

const querystring = require('querystring');

console.log('=== Array Parameter Handling ===\n');

// Convention 1: Repeated Keys (most common)
console.log('1. Repeated Keys (Standard)');
const repeated = 'color=red&color=blue&color=green';
const parsedRepeated = querystring.parse(repeated);
console.log('Input:', repeated);
console.log('Parsed:', parsedRepeated);
console.log('Is array?', Array.isArray(parsedRepeated.color));
console.log('Values:', parsedRepeated.color);
console.log('');

// Building with arrays
const colorsObj = { color: ['red', 'blue', 'green'] };
const builtRepeated = querystring.stringify(colorsObj);
console.log('Object:', colorsObj);
console.log('Stringified:', builtRepeated);
console.log('');

// Convention 2: Bracket Notation (PHP-style)
console.log('2. Bracket Notation (PHP-style)');
const bracket = 'color[]=red&color[]=blue&color[]=green';
console.log('Input:', bracket);
console.log('Note: querystring module treats [] as part of the key name');

const parsedBracket = querystring.parse(bracket);
console.log('Parsed:', parsedBracket);
console.log('Key is literally "color[]":', parsedBracket['color[]']);
console.log('');

// Handling bracket notation properly
function parseBracketNotation(queryStr) {
  const params = querystring.parse(queryStr);
  const result = {};

  for (const [key, value] of Object.entries(params)) {
    const cleanKey = key.replace(/\[\]$/, ''); // Remove []
    result[cleanKey] = value;
  }

  return result;
}

const cleanParsed = parseBracketNotation(bracket);
console.log('Cleaned:', cleanParsed);
console.log('');

// Convention 3: Comma-Separated Values
console.log('3. Comma-Separated Values');
const comma = 'colors=red,blue,green';
const parsedComma = querystring.parse(comma);
console.log('Input:', comma);
console.log('Parsed:', parsedComma);
console.log('Value:', parsedComma.colors);
console.log('Note: Treated as single string, need manual splitting');
console.log('');

// Manual splitting
const splitColors = parsedComma.colors.split(',');
console.log('Split:', splitColors);
console.log('');

// Helper function for comma-separated
function parseCommaSeparated(queryStr, arrayKeys = []) {
  const params = querystring.parse(queryStr);

  arrayKeys.forEach(key => {
    if (params[key] && typeof params[key] === 'string') {
      params[key] = params[key].split(',').map(v => v.trim());
    }
  });

  return params;
}

const parsed = parseCommaSeparated('colors=red,blue,green&size=large', ['colors']);
console.log('Parsed with helper:', parsed);
console.log('');

// Convention 4: Indexed Parameters
console.log('4. Indexed Parameters');
const indexed = 'color[0]=red&color[1]=blue&color[2]=green';
const parsedIndexed = querystring.parse(indexed);
console.log('Input:', indexed);
console.log('Parsed:', parsedIndexed);
console.log('Note: Creates object with indexed keys');
console.log('');

// Converting indexed to array
function indexedToArray(obj, key) {
  const values = [];
  let i = 0;

  while (obj[`${key}[${i}]`] !== undefined) {
    values.push(obj[`${key}[${i}]`]);
    i++;
  }

  return values;
}

const arrayFromIndexed = indexedToArray(parsedIndexed, 'color');
console.log('Converted to array:', arrayFromIndexed);
console.log('');

// Comparison of conventions
console.log('=== Convention Comparison ===\n');

const testData = { colors: ['red', 'blue', 'green'], size: 'large' };

console.log('Original data:', testData);
console.log('');

// 1. Repeated keys
const repeated1 = querystring.stringify(testData);
console.log('1. Repeated keys:', repeated1);
console.log('   Pros: Standard, widely supported, parsed automatically');
console.log('   Cons: Longer URLs with many values');
console.log('');

// 2. Comma-separated
const comma1 = querystring.stringify({ colors: testData.colors.join(','), size: testData.size });
console.log('2. Comma-separated:', comma1);
console.log('   Pros: Shorter URLs, human-readable');
console.log('   Cons: Need manual parsing, issues with commas in values');
console.log('');

// 3. Bracket notation
const bracket1 = testData.colors.map(c => `colors[]=${c}`).join('&') + `&size=${testData.size}`;
console.log('3. Bracket notation:', bracket1);
console.log('   Pros: Clear array indicator, PHP compatible');
console.log('   Cons: Not natively supported by querystring module');
console.log('');

// Real-world example: E-commerce filters
console.log('=== Real-World: E-commerce Filters ===\n');

class FilterUrlBuilder {
  static build(filters) {
    const params = {};

    // Single values
    if (filters.category) params.category = filters.category;
    if (filters.sort) params.sort = filters.sort;

    // Array values (using repeated keys)
    if (filters.brands && filters.brands.length > 0) {
      params.brand = filters.brands;
    }
    if (filters.sizes && filters.sizes.length > 0) {
      params.size = filters.sizes;
    }
    if (filters.colors && filters.colors.length > 0) {
      params.color = filters.colors;
    }

    // Price range
    if (filters.minPrice) params.minPrice = filters.minPrice;
    if (filters.maxPrice) params.maxPrice = filters.maxPrice;

    return querystring.stringify(params);
  }

  static parse(queryStr) {
    const params = querystring.parse(queryStr);

    // Helper to ensure array
    const toArray = (val) => {
      if (!val) return [];
      return Array.isArray(val) ? val : [val];
    };

    return {
      category: params.category || '',
      sort: params.sort || 'relevance',
      brands: toArray(params.brand),
      sizes: toArray(params.size),
      colors: toArray(params.color),
      minPrice: params.minPrice ? parseFloat(params.minPrice) : null,
      maxPrice: params.maxPrice ? parseFloat(params.maxPrice) : null
    };
  }
}

// Build complex filter URL
const filters = {
  category: 'clothing',
  brands: ['Nike', 'Adidas', 'Puma'],
  sizes: ['M', 'L', 'XL'],
  colors: ['black', 'white', 'blue'],
  minPrice: 50,
  maxPrice: 200,
  sort: 'price'
};

const filterUrl = FilterUrlBuilder.build(filters);
console.log('Filter URL:', filterUrl);
console.log('');

// Parse it back
const parsedFilters = FilterUrlBuilder.parse(filterUrl);
console.log('Parsed filters:', parsedFilters);
console.log('');

// URLSearchParams comparison
console.log('=== URLSearchParams Comparison ===\n');

const params1 = new URLSearchParams();
params1.append('color', 'red');
params1.append('color', 'blue');
params1.append('color', 'green');

console.log('URLSearchParams toString():', params1.toString());
console.log('Get single:', params1.get('color'));
console.log('Get all:', params1.getAll('color'));
console.log('');

// Best practices
console.log('=== Best Practices ===');
console.log('✓ Use repeated keys for maximum compatibility');
console.log('✓ Always handle both single and array values');
console.log('✓ Provide helper functions for array conversion');
console.log('✓ Document which convention you use');
console.log('✓ Be consistent across your application');
console.log('✓ Consider comma-separated for very long lists');
console.log('✓ Use URLSearchParams for new projects');
