/**
 * Level 3 Example 1: Production URL Utility Library
 *
 * A complete, production-ready URL manipulation library with
 * validation, security, and comprehensive error handling.
 */

const querystring = require('querystring');

/**
 * Production-grade URL utility class
 */
class UrlUtil {
  /**
   * Parse URL with validation
   */
  static parse(url, options = {}) {
    const { validate = true, maxLength = 2000 } = options;

    if (validate) {
      this.validate(url, maxLength);
    }

    const [base, query = ''] = url.split('?');
    const params = querystring.parse(query);

    return {
      base,
      params,
      query,
      toString() {
        const q = querystring.stringify(this.params);
        return q ? `${this.base}?${q}` : this.base;
      }
    };
  }

  /**
   * Build URL with validation
   */
  static build(base, params, options = {}) {
    const { validate = true, clean = true, maxLength = 2000 } = options;

    if (validate) {
      this.validateBase(base);
      this.validateParams(params);
    }

    let processedParams = params;
    if (clean) {
      processedParams = this.cleanParams(params);
    }

    const query = querystring.stringify(processedParams);
    const url = query ? `${base}?${query}` : base;

    if (validate && url.length > maxLength) {
      throw new Error(`URL exceeds maximum length of ${maxLength} characters`);
    }

    return url;
  }

  /**
   * Validate URL
   */
  static validate(url, maxLength = 2000) {
    if (typeof url !== 'string') {
      throw new TypeError('URL must be a string');
    }

    if (url.length === 0) {
      throw new Error('URL cannot be empty');
    }

    if (url.length > maxLength) {
      throw new Error(`URL exceeds maximum length of ${maxLength}`);
    }

    // Check for dangerous characters
    const dangerous = ['<', '>', '"', "'"];
    for (const char of dangerous) {
      if (url.includes(char)) {
        throw new Error(`URL contains dangerous character: ${char}`);
      }
    }

    return true;
  }

  /**
   * Validate base path
   */
  static validateBase(base) {
    if (typeof base !== 'string' || base.length === 0) {
      throw new Error('Base path must be a non-empty string');
    }

    if (!base.startsWith('/') && !base.startsWith('http')) {
      throw new Error('Base path must start with / or http');
    }

    return true;
  }

  /**
   * Validate parameters
   */
  static validateParams(params) {
    if (typeof params !== 'object' || params === null) {
      throw new TypeError('Params must be an object');
    }

    for (const [key, value] of Object.entries(params)) {
      if (typeof key !== 'string') {
        throw new TypeError('Parameter keys must be strings');
      }

      if (value !== null && value !== undefined) {
        const type = typeof value;
        if (type !== 'string' && type !== 'number' && type !== 'boolean' && !Array.isArray(value)) {
          throw new TypeError(`Parameter "${key}" has invalid type: ${type}`);
        }
      }
    }

    return true;
  }

  /**
   * Clean parameters (remove null, undefined, empty)
   */
  static cleanParams(params) {
    const cleaned = {};

    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          const cleanedArray = value.filter(v => v !== null && v !== undefined && v !== '');
          if (cleanedArray.length > 0) {
            cleaned[key] = cleanedArray;
          }
        } else {
          cleaned[key] = value;
        }
      }
    }

    return cleaned;
  }

  /**
   * Sanitize user input
   */
  static sanitize(value) {
    if (typeof value !== 'string') {
      return value;
    }

    return value
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  /**
   * Merge URLs safely
   */
  static merge(url, newParams, options = {}) {
    const parsed = this.parse(url, options);
    const merged = { ...parsed.params, ...newParams };

    return this.build(parsed.base, merged, options);
  }
}

// Example usage
console.log('=== Production URL Utility Demo ===\n');

try {
  // Build with validation
  const url1 = UrlUtil.build('/api/users', {
    role: 'admin',
    active: true,
    page: 1,
    limit: 50
  });
  console.log('Built URL:', url1);

  // Parse and validate
  const parsed = UrlUtil.parse(url1);
  console.log('Parsed:', parsed.params);

  // Clean parameters
  const dirty = {
    name: 'John',
    email: '',
    age: null,
    active: true
  };
  const clean = UrlUtil.cleanParams(dirty);
  console.log('Cleaned params:', clean);

  // Merge URLs
  const merged = UrlUtil.merge('/search?q=nodejs&page=1', { page: 2, limit: 50 });
  console.log('Merged URL:', merged);

} catch (error) {
  console.error('Error:', error.message);
}

console.log('\n✓ Production-ready with validation, sanitization, and error handling');

module.exports = UrlUtil;
