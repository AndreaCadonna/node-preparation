/**
 * Example 3: Custom Separators
 *
 * Demonstrates using custom separators and delimiters
 * instead of the standard & and =.
 */

const querystring = require('querystring');

console.log('=== Custom Separators ===\n');

// 1. Basic custom separators
console.log('1. Basic Custom Separators\n');

// Standard format
const standard = querystring.stringify({ name: 'John', age: 30, city: 'NYC' });
console.log('Standard (&, =):', standard);

// Semicolon separator
const semicolon = querystring.stringify({ name: 'John', age: 30, city: 'NYC' }, ';');
console.log('Semicolon separator:', semicolon);

// Pipe separator
const pipe = querystring.stringify({ name: 'John', age: 30, city: 'NYC' }, '|');
console.log('Pipe separator:', pipe);

// Custom delimiter too
const custom = querystring.stringify({ name: 'John', age: 30, city: 'NYC' }, ';', ':');
console.log('Custom both (;, :):', custom);
console.log('');

// 2. Parsing with custom separators
console.log('2. Parsing with Custom Separators\n');

// Parse with semicolon
const parsed1 = querystring.parse('name=John;age=30;city=NYC', ';');
console.log('Input: name=John;age=30;city=NYC');
console.log('Parsed:', parsed1);

// Parse with custom both
const parsed2 = querystring.parse('name:John;age:30;city:NYC', ';', ':');
console.log('Input: name:John;age:30;city:NYC');
console.log('Parsed:', parsed2);
console.log('');

// 3. Why use custom separators?
console.log('3. When to Use Custom Separators\n');

// Case 1: Values contain standard separators
console.log('Case 1: Values contain & or =');
const problematic = {
  equation: '2+2=4',
  expression: 'a&b',
  formula: 'x=y&z'
};

// Standard encoding (works but ugly)
const standardEncoded = querystring.stringify(problematic);
console.log('Standard:', standardEncoded);
console.log('Hard to read!');

// Custom separators (cleaner)
const customSep = querystring.stringify(problematic, ';', ':');
console.log('Custom (;, :):', customSep);
console.log('More readable for humans');
console.log('');

// Case 2: Log file formats
console.log('Case 2: Log File Format');
const logEntry = {
  timestamp: '2024-01-15T10:30:00',
  level: 'ERROR',
  message: 'Connection failed',
  code: 500
};

const logFormat = querystring.stringify(logEntry, ' | ', '=');
console.log('Log format:', logFormat);
console.log('Easy to parse and read in logs');
console.log('');

// Case 3: Configuration files
console.log('Case 3: Configuration Format');
const config = {
  host: 'localhost',
  port: 3000,
  debug: true,
  maxConnections: 100
};

const confFormat = querystring.stringify(config, '\n', ' = ');
console.log('Config format:\n' + confFormat);
console.log('');

// 4. Practical example: Cookie-style format
console.log('4. Cookie-Style Format\n');

class CookieParams {
  static stringify(obj) {
    return querystring.stringify(obj, '; ');
  }

  static parse(str) {
    return querystring.parse(str, '; ');
  }
}

const sessionData = {
  sessionId: 'abc123',
  userId: '42',
  preferences: 'dark-mode',
  expires: '2024-12-31'
};

const cookieStr = CookieParams.stringify(sessionData);
console.log('Cookie string:', cookieStr);

const parsedCookie = CookieParams.parse(cookieStr);
console.log('Parsed back:', parsedCookie);
console.log('');

// 5. CSV-like format
console.log('5. CSV-Like Format\n');

class CsvParams {
  static stringify(obj) {
    // Convert to CSV-like format
    const pairs = Object.entries(obj).map(([k, v]) => `${k}:${v}`);
    return pairs.join(',');
  }

  static parse(str) {
    return querystring.parse(str, ',', ':');
  }
}

const data = {
  id: '123',
  name: 'Product',
  price: '99.99',
  stock: '50'
};

const csvStr = CsvParams.stringify(data);
console.log('CSV-like:', csvStr);

const parsedCsv = CsvParams.parse(csvStr);
console.log('Parsed:', parsedCsv);
console.log('');

// 6. Tab-separated format
console.log('6. Tab-Separated Format\n');

const tsvData = {
  column1: 'value1',
  column2: 'value2',
  column3: 'value3'
};

const tsv = querystring.stringify(tsvData, '\t', '=');
console.log('TSV format:', JSON.stringify(tsv));
console.log('Parsed:', querystring.parse(tsv, '\t', '='));
console.log('');

// 7. Mixed separators (advanced)
console.log('7. Handling Mixed Formats\n');

class MultiFormatParser {
  static detect(str) {
    if (str.includes(';') && str.includes(':')) {
      return { sep: ';', eq: ':' };
    }
    if (str.includes('|')) {
      return { sep: '|', eq: '=' };
    }
    if (str.includes('&')) {
      return { sep: '&', eq: '=' };
    }
    return { sep: '&', eq: '=' }; // default
  }

  static parse(str) {
    const { sep, eq } = this.detect(str);
    return querystring.parse(str, sep, eq);
  }
}

console.log('Auto-detecting format:');
console.log('Input: "a=1&b=2"');
console.log('Parsed:', MultiFormatParser.parse('a=1&b=2'));

console.log('Input: "a:1;b:2"');
console.log('Parsed:', MultiFormatParser.parse('a:1;b:2'));

console.log('Input: "a=1|b=2"');
console.log('Parsed:', MultiFormatParser.parse('a=1|b=2'));
console.log('');

// 8. Use cases summary
console.log('8. Real-World Use Cases\n');

// Database query format
const dbQuery = {
  SELECT: 'name,age,email',
  FROM: 'users',
  WHERE: 'age>18',
  LIMIT: '100'
};
const sql = querystring.stringify(dbQuery, ' ', ' ');
console.log('SQL-like:', sql);

// Path parameters
const pathParams = {
  year: '2024',
  month: '01',
  day: '15'
};
const pathFormat = querystring.stringify(pathParams, '/', '');
console.log('Path-like:', pathFormat);

// Command-line arguments style
const cliArgs = {
  input: 'file.txt',
  output: 'result.txt',
  verbose: 'true'
};
const cliFormat = querystring.stringify(cliArgs, ' ', '=');
console.log('CLI-like:', cliFormat);
console.log('');

// 9. Performance considerations
console.log('9. Performance Notes\n');

console.log('Custom separators:');
console.log('  ✓ Same performance as standard');
console.log('  ✓ No additional overhead');
console.log('  ✓ Just string manipulation');

console.log('\nChoose separators that:');
console.log('  ✓ Don\'t appear in your data');
console.log('  ✓ Are easy to read');
console.log('  ✓ Match your use case');
console.log('  ✓ Are consistent across your app');
console.log('');

// 10. Limitations
console.log('10. Limitations\n');

console.log('URLSearchParams does NOT support custom separators:');
const usp = new URLSearchParams();
usp.append('a', '1');
usp.append('b', '2');
console.log('Always uses &:', usp.toString());

console.log('\nUse querystring module when you need:');
console.log('  ✓ Custom separators');
console.log('  ✓ Non-standard formats');
console.log('  ✓ Special parsing requirements');
console.log('  ✓ Legacy system compatibility');
console.log('');

console.log('=== Best Practices ===');
console.log('✓ Use standard & and = for URLs');
console.log('✓ Use custom separators for:');
console.log('  - Log formats');
console.log('  - Configuration files');
console.log('  - Non-URL data serialization');
console.log('  - Legacy system integration');
console.log('✓ Document your separator choices');
console.log('✓ Be consistent within your application');
console.log('✓ Consider URL encoding when using special chars');
