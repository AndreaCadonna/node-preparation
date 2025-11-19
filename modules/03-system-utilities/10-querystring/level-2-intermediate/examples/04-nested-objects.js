/**
 * Example 4: Nested Object Handling
 *
 * Demonstrates techniques for flattening and unflattening
 * nested objects for query strings.
 */

const querystring = require('querystring');

console.log('=== Nested Object Handling ===\n');

// Problem: querystring doesn't handle nested objects natively
const nested = {
  user: {
    name: 'John',
    age: 30
  },
  settings: {
    theme: 'dark',
    notifications: true
  }
};

console.log('Nested object:', nested);
console.log('Direct stringify:', querystring.stringify(nested));
console.log('Problem: Objects become [object Object]\n');

// Solution 1: Dot notation flattening
function flattenDotNotation(obj, prefix = '') {
  const flattened = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(flattened, flattenDotNotation(value, newKey));
    } else {
      flattened[newKey] = value;
    }
  }
  
  return flattened;
}

const flattened = flattenDotNotation(nested);
console.log('Flattened (dot notation):', flattened);
console.log('Stringified:', querystring.stringify(flattened));
console.log('');

// Unflatten
function unflattenDotNotation(obj) {
  const result = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const keys = key.split('.');
    let current = result;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
  }
  
  return result;
}

const unflattened = unflattenDotNotation(flattened);
console.log('Unflattened:', unflattened);
console.log('');

// Solution 2: Bracket notation
function flattenBracketNotation(obj, prefix = '') {
  const flattened = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}[${key}]` : key;
    
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(flattened, flattenBracketNotation(value, newKey));
    } else {
      flattened[newKey] = value;
    }
  }
  
  return flattened;
}

const bracketFlat = flattenBracketNotation(nested);
console.log('Flattened (bracket notation):', bracketFlat);
console.log('Stringified:', querystring.stringify(bracketFlat));
console.log('');

// Solution 3: JSON stringify (simple but verbose)
const jsonParam = { filter: JSON.stringify(nested) };
console.log('JSON in param:', querystring.stringify(jsonParam));

const parsed = querystring.parse(querystring.stringify(jsonParam));
const recovered = JSON.parse(parsed.filter);
console.log('Recovered:', recovered);
console.log('');

// Real-world example: Filter builder
class FilterBuilder {
  static stringify(filters) {
    return querystring.stringify(flattenDotNotation(filters));
  }
  
  static parse(queryStr) {
    const params = querystring.parse(queryStr);
    return unflattenDotNotation(params);
  }
}

const complexFilters = {
  product: {
    category: 'electronics',
    price: {
      min: 100,
      max: 1000
    }
  },
  sort: {
    by: 'price',
    order: 'asc'
  }
};

const filterQuery = FilterBuilder.stringify(complexFilters);
console.log('Filter query:', filterQuery);
console.log('Parsed back:', FilterBuilder.parse(filterQuery));

console.log('\n=== Best Practices ===');
console.log('✓ Keep nesting shallow (2-3 levels max)');
console.log('✓ Use dot notation for simple cases');
console.log('✓ Use JSON for complex structures');
console.log('✓ Document your flattening strategy');
console.log('✓ Consider using POST for complex data');
