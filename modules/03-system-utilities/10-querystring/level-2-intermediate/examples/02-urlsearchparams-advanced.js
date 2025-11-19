/**
 * Example 2: URLSearchParams Advanced Usage
 *
 * Demonstrates the complete URLSearchParams API and advanced patterns.
 */

console.log('=== URLSearchParams Advanced Usage ===\n');

// 1. Creating URLSearchParams
console.log('1. Creating URLSearchParams\n');

// From string
const params1 = new URLSearchParams('name=John&age=30&city=NYC');
console.log('From string:', params1.toString());

// From object
const params2 = new URLSearchParams({ name: 'Jane', age: '25' });
console.log('From object:', params2.toString());

// From array of pairs
const params3 = new URLSearchParams([
  ['name', 'Bob'],
  ['age', '35'],
  ['city', 'LA']
]);
console.log('From array:', params3.toString());

// Empty
const params4 = new URLSearchParams();
console.log('Empty:', params4.toString() || '(empty)');
console.log('');

// 2. Reading values
console.log('2. Reading Values\n');

const search = new URLSearchParams('q=nodejs&category=tutorial&page=2');

// Get single value
console.log('get("q"):', search.get('q'));
console.log('get("category"):', search.get('category'));
console.log('get("missing"):', search.get('missing')); // null

// Get all values (for arrays)
search.append('tag', 'javascript');
search.append('tag', 'backend');
console.log('getAll("tag"):', search.getAll('tag'));

// Check existence
console.log('has("q"):', search.has('q'));
console.log('has("missing"):', search.has('missing'));
console.log('');

// 3. Modifying parameters
console.log('3. Modifying Parameters\n');

const params = new URLSearchParams('a=1&b=2');
console.log('Initial:', params.toString());

// Set (replaces all)
params.set('a', '10');
console.log('After set("a", "10"):', params.toString());

// Append (adds)
params.append('c', '3');
console.log('After append("c", "3"):', params.toString());

// Append to existing (creates array)
params.append('a', '20');
console.log('After append("a", "20"):', params.toString());
console.log('getAll("a"):', params.getAll('a'));

// Delete
params.delete('b');
console.log('After delete("b"):', params.toString());

// Set replaces all values
params.set('a', '100');
console.log('After set("a", "100"):', params.toString());
console.log('getAll("a") after set:', params.getAll('a'));
console.log('');

// 4. Iteration
console.log('4. Iteration\n');

const iter = new URLSearchParams('name=John&age=30&city=NYC&tag=a&tag=b');

// forEach
console.log('forEach:');
iter.forEach((value, key) => {
  console.log(`  ${key}: ${value}`);
});
console.log('');

// for...of entries
console.log('for...of entries:');
for (const [key, value] of iter.entries()) {
  console.log(`  ${key}: ${value}`);
}
console.log('');

// for...of (default iterator is entries)
console.log('for...of (shorthand):');
for (const [key, value] of iter) {
  console.log(`  ${key}: ${value}`);
}
console.log('');

// Keys
console.log('keys():', Array.from(iter.keys()));

// Values
console.log('values():', Array.from(iter.values()));
console.log('');

// 5. Sorting
console.log('5. Sorting\n');

const unsorted = new URLSearchParams('z=26&a=1&m=13&b=2');
console.log('Before sort():', unsorted.toString());
unsorted.sort();
console.log('After sort():', unsorted.toString());
console.log('');

// 6. Converting to object
console.log('6. Converting to Object\n');

const params6 = new URLSearchParams('name=John&age=30&active=true');

// Method 1: Manual iteration
const obj1 = {};
params6.forEach((value, key) => {
  obj1[key] = value;
});
console.log('Manual iteration:', obj1);

// Method 2: Object.fromEntries
const obj2 = Object.fromEntries(params6);
console.log('Object.fromEntries:', obj2);

// Handling arrays
const paramsWithArray = new URLSearchParams('name=John&tag=a&tag=b&tag=c');
const objWithArrays = {};
for (const [key, value] of paramsWithArray) {
  if (objWithArrays[key]) {
    if (Array.isArray(objWithArrays[key])) {
      objWithArrays[key].push(value);
    } else {
      objWithArrays[key] = [objWithArrays[key], value];
    }
  } else {
    objWithArrays[key] = value;
  }
}
console.log('With arrays:', objWithArrays);
console.log('');

// 7. URL integration
console.log('7. URL Integration\n');

const fullUrl = new URL('https://example.com/search?q=nodejs&page=2');
console.log('URL:', fullUrl.href);

// Access searchParams
console.log('searchParams:', fullUrl.searchParams.toString());
console.log('get("q"):', fullUrl.searchParams.get('q'));

// Modify
fullUrl.searchParams.set('page', '3');
fullUrl.searchParams.append('limit', '50');
console.log('Modified URL:', fullUrl.href);

// Delete
fullUrl.searchParams.delete('limit');
console.log('After delete:', fullUrl.href);
console.log('');

// 8. Builder pattern
console.log('8. Builder Pattern\n');

class UrlBuilder {
  constructor(baseUrl) {
    this.url = new URL(baseUrl);
  }

  param(key, value) {
    this.url.searchParams.set(key, value);
    return this;
  }

  params(obj) {
    Object.entries(obj).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => this.url.searchParams.append(key, v));
      } else {
        this.url.searchParams.set(key, value);
      }
    });
    return this;
  }

  remove(key) {
    this.url.searchParams.delete(key);
    return this;
  }

  toString() {
    return this.url.href;
  }

  getSearchParams() {
    return this.url.searchParams;
  }
}

const builder = new UrlBuilder('https://api.example.com/products');
const apiUrl = builder
  .param('category', 'electronics')
  .param('sort', 'price')
  .params({ page: 1, limit: 20 })
  .params({ brand: ['Apple', 'Samsung'] })
  .toString();

console.log('Built URL:', apiUrl);
console.log('');

// 9. Comparison with querystring
console.log('9. querystring vs URLSearchParams\n');

const qs = require('querystring');

const testStr = 'name=John Doe&age=30';

// querystring
const qsParsed = qs.parse(testStr);
console.log('querystring.parse():', qsParsed);
console.log('Type:', typeof qsParsed, '(plain object)');
console.log('Access:', qsParsed.name);

// URLSearchParams
const uspParsed = new URLSearchParams(testStr);
console.log('URLSearchParams:', uspParsed.toString());
console.log('Type:', uspParsed.constructor.name);
console.log('Access:', uspParsed.get('name'));

// Space encoding difference
const withSpaces = { name: 'John Doe' };
console.log('\nSpace encoding:');
console.log('querystring:', qs.stringify(withSpaces)); // %20
console.log('URLSearchParams:', new URLSearchParams(withSpaces).toString()); // +
console.log('');

// 10. Practical utilities
console.log('10. Practical Utilities\n');

class QueryStringUtils {
  // Merge query strings
  static merge(url, newParams) {
    const urlObj = new URL(url, 'http://example.com');
    Object.entries(newParams).forEach(([key, value]) => {
      urlObj.searchParams.set(key, value);
    });
    return urlObj.search;
  }

  // Remove parameters
  static remove(url, keysToRemove) {
    const urlObj = new URL(url, 'http://example.com');
    keysToRemove.forEach(key => {
      urlObj.searchParams.delete(key);
    });
    return urlObj.search;
  }

  // Pick specific parameters
  static pick(url, keysToPick) {
    const urlObj = new URL(url, 'http://example.com');
    const picked = new URLSearchParams();

    keysToPick.forEach(key => {
      if (urlObj.searchParams.has(key)) {
        const values = urlObj.searchParams.getAll(key);
        values.forEach(v => picked.append(key, v));
      }
    });

    return picked.toString() ? `?${picked.toString()}` : '';
  }

  // Clean empty values
  static clean(params) {
    const cleaned = new URLSearchParams();

    for (const [key, value] of params) {
      if (value !== '' && value !== null && value !== undefined) {
        cleaned.append(key, value);
      }
    }

    return cleaned;
  }
}

const testUrl = 'http://example.com/page?a=1&b=2&c=3&d=4';
console.log('Original:', testUrl);
console.log('Merged:', QueryStringUtils.merge(testUrl, { e: 5, b: 20 }));
console.log('Removed:', QueryStringUtils.remove(testUrl, ['b', 'd']));
console.log('Picked:', QueryStringUtils.pick(testUrl, ['a', 'c']));

const dirtyParams = new URLSearchParams('a=1&b=&c=3&d=');
console.log('Dirty:', dirtyParams.toString());
console.log('Cleaned:', QueryStringUtils.clean(dirtyParams).toString());
console.log('');

console.log('=== Summary ===');
console.log('✓ URLSearchParams provides rich API for query strings');
console.log('✓ Use get()/getAll() for reading, set()/append() for writing');
console.log('✓ Iterate with forEach(), for...of, or convert to object');
console.log('✓ Integrates seamlessly with URL objects');
console.log('✓ Prefer for new code over querystring module');
console.log('✓ Space encoding uses + instead of %20');
