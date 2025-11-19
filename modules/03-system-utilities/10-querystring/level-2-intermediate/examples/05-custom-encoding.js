/**
 * Example 5: Custom Encoding Strategies
 *
 * Demonstrates custom encoding and decoding strategies
 * for special requirements.
 */

const querystring = require('querystring');

console.log('=== Custom Encoding Strategies ===\n');

// 1. Custom encoder for special characters
function customEncode(str) {
  // Encode everything except alphanumeric, dash, underscore, tilde
  return str.replace(/[^A-Za-z0-9\-_.~]/g, (c) => {
    return '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0');
  });
}

function customDecode(str) {
  return str.replace(/%([0-9A-F]{2})/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
}

console.log('1. Custom Encoder\n');
const text = 'Hello World! @user';
console.log('Original:', text);
console.log('Custom encode:', customEncode(text));
console.log('Built-in escape:', querystring.escape(text));
console.log('Custom decode:', customDecode(customEncode(text)));
console.log('');

// 2. Base64 encoding for binary data
console.log('2. Base64 Encoding\n');

function base64Stringify(obj) {
  const encoded = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && value.length > 100) {
      // Encode long strings as base64
      encoded[key] = Buffer.from(value).toString('base64url');
      encoded[`${key}_encoded`] = 'base64';
    } else {
      encoded[key] = value;
    }
  }
  return querystring.stringify(encoded);
}

const longData = {
  short: 'hello',
  long: 'a'.repeat(200)
};

console.log('With base64:', base64Stringify(longData));
console.log('');

// 3. Custom stringify with encoding options
class CustomQueryString {
  static stringify(obj, options = {}) {
    const {
      encodeSpaces = '%20', // or '+' 
      preserveCase = false,
      maxLength = 2000
    } = options;
    
    let result = querystring.stringify(obj);
    
    if (encodeSpaces === '+') {
      result = result.replace(/%20/g, '+');
    }
    
    if (!preserveCase) {
      result = result.toLowerCase();
    }
    
    if (result.length > maxLength) {
      console.warn('Warning: Query string exceeds max length');
    }
    
    return result;
  }
}

console.log('3. Custom Options\n');
const params = { Name: 'John Doe', Age: '30' };
console.log('Standard:', CustomQueryString.stringify(params));
console.log('With +:', CustomQueryString.stringify(params, { encodeSpaces: '+' }));
console.log('Preserve case:', CustomQueryString.stringify(params, { preserveCase: true }));
console.log('');

// 4. Compression for large query strings
console.log('4. Compression Strategy\n');

function abbreviate(obj) {
  const abbrev = {
    category: 'cat',
    subcategory: 'sub',
    minPrice: 'minP',
    maxPrice: 'maxP',
    sortBy: 'sort'
  };
  
  const abbreviated = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = abbrev[key] || key;
    abbreviated[newKey] = value;
  }
  
  return abbreviated;
}

const verbose = {
  category: 'electronics',
  subcategory: 'laptops',
  minPrice: 500,
  maxPrice: 2000,
  sortBy: 'price'
};

console.log('Original:', querystring.stringify(verbose));
console.log('Abbreviated:', querystring.stringify(abbreviate(verbose)));
console.log('');

// 5. Safe encoding for special requirements
console.log('5. Safe Encoding for Email/URLs\n');

function safeEncode(str) {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A');
}

const special = "user@example.com (john's account)!";
console.log('Original:', special);
console.log('Safe encode:', safeEncode(special));
console.log('Standard:', querystring.escape(special));

console.log('\n=== Best Practices ===');
console.log('✓ Use built-in encoding for most cases');
console.log('✓ Custom encoding for special requirements');
console.log('✓ Document custom encoding schemes');
console.log('✓ Test encoding/decoding round-trips');
console.log('✓ Consider base64 for binary data');
