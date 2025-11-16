/**
 * Exercise 5 Solution: Count Lines in a Text File
 *
 * This solution demonstrates:
 * - Text file analysis
 * - Line, word, and character counting
 * - Handling edge cases (empty files, trailing newlines)
 * - Formatted output
 * - Statistical calculations
 */

const fs = require('fs').promises;
const path = require('path');

async function analyzeFile() {
  try {
    console.log('═'.repeat(50));
    console.log('File Statistics Analyzer');
    console.log('═'.repeat(50));
    console.log();

    // 1. Get filename from command-line arguments
    const filename = process.argv[2];

    // 2. Validate filename was provided
    if (!filename) {
      console.error('✗ Usage: node exercise-5-solution.js <filename>');
      console.error('   Example: node exercise-5-solution.js document.txt');
      process.exit(1);
    }

    const filePath = path.resolve(filename);

    // Check if file exists and is readable
    try {
      await fs.access(filePath, fs.constants.R_OK);
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.error(`✗ File not found: ${path.basename(filePath)}`);
      } else if (err.code === 'EACCES') {
        console.error(`✗ Permission denied: ${path.basename(filePath)}`);
      } else {
        console.error(`✗ Error: ${err.message}`);
      }
      process.exit(1);
    }

    // 3. Read the file
    const content = await fs.readFile(filePath, 'utf8');
    const stats = await fs.stat(filePath);

    console.log(`File: ${path.basename(filePath)}`);
    console.log(`Size: ${stats.size.toLocaleString()} bytes`);
    console.log();

    // 4. Count lines (handle edge cases)
    let lineCount = 0;

    if (content.length === 0) {
      // Empty file
      lineCount = 0;
    } else if (content === '\n' || content === '\r\n') {
      // File with only a newline
      lineCount = 1;
    } else {
      // Normal file - split by newlines
      const lines = content.split('\n');

      // If last line is empty (file ends with newline), don't count it
      if (lines[lines.length - 1] === '') {
        lineCount = lines.length - 1;
      } else {
        lineCount = lines.length;
      }

      // Handle case where file has content but no newlines
      if (lineCount === 0 && content.length > 0) {
        lineCount = 1;
      }
    }

    // 5. Count words
    let wordCount = 0;

    if (content.trim().length > 0) {
      const words = content.split(/\s+/).filter(Boolean);
      wordCount = words.length;
    }

    // 6. Count characters
    const charCount = content.length;
    const charCountNoSpaces = content.replace(/\s/g, '').length;

    // 7. Display formatted statistics
    console.log('Counts:');
    console.log('─'.repeat(50));
    console.log(`Lines:              ${lineCount.toLocaleString()}`);
    console.log(`Words:              ${wordCount.toLocaleString()}`);
    console.log(`Characters:         ${charCount.toLocaleString()}`);
    console.log(`Characters (no spaces): ${charCountNoSpaces.toLocaleString()}`);
    console.log();

    // Calculate and display averages
    if (lineCount > 0) {
      console.log('Averages:');
      console.log('─'.repeat(50));
      console.log(`Words per line:     ${(wordCount / lineCount).toFixed(1)}`);
      console.log(`Characters per line: ${(charCount / lineCount).toFixed(1)}`);

      if (wordCount > 0) {
        console.log(`Characters per word: ${(charCountNoSpaces / wordCount).toFixed(1)}`);
      }
      console.log();
    }

    // Additional details
    const lines = content.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    const emptyLines = lineCount - nonEmptyLines.length;

    const lineLengths = lines.map(line => line.length);
    const longestLine = Math.max(...lineLengths, 0);

    console.log('Details:');
    console.log('─'.repeat(50));
    console.log(`Longest line:       ${longestLine} characters`);
    console.log(`Empty lines:        ${emptyLines}`);
    console.log(`Non-empty lines:    ${nonEmptyLines.length}`);

    console.log();
    console.log('═'.repeat(50));

  } catch (err) {
    console.error('✗ Error:', err.message);
    process.exit(1);
  }
}

// Run the function
analyzeFile();

/**
 * ALTERNATIVE SOLUTION: More Robust Line Counting
 */

async function analyzeFileRobust() {
  const filename = process.argv[2];

  if (!filename) {
    console.error('Usage: node script.js <filename>');
    process.exit(1);
  }

  try {
    const content = await fs.readFile(filename, 'utf8');

    // Robust line counting that handles all edge cases
    function countLines(text) {
      if (text.length === 0) return 0;

      // Count newline characters
      const newlines = (text.match(/\n/g) || []).length;

      // If file doesn't end with newline, add 1
      const endsWithNewline = text.endsWith('\n');

      return endsWithNewline ? newlines : newlines + 1;
    }

    const lines = countLines(content);
    const words = content.trim() ? content.split(/\s+/).filter(Boolean).length : 0;
    const chars = content.length;

    console.log('File Statistics:');
    console.log(`Lines: ${lines}`);
    console.log(`Words: ${words}`);
    console.log(`Characters: ${chars}`);

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

/**
 * BONUS SOLUTION: With Unique Word Count
 */

async function analyzeFileWithUniqueWords() {
  const filename = process.argv[2];

  if (!filename) {
    console.error('Usage: node script.js <filename>');
    process.exit(1);
  }

  try {
    const content = await fs.readFile(filename, 'utf8');

    // Basic counts
    const lines = content.split('\n').length;
    const allWords = content.toLowerCase().split(/\s+/).filter(Boolean);
    const words = allWords.length;
    const chars = content.length;

    // Unique words
    const uniqueWords = new Set(allWords);

    // Word frequency
    const wordFreq = {};
    allWords.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    // Top 5 most common words
    const topWords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    console.log('File Statistics:');
    console.log('─'.repeat(50));
    console.log(`Lines:          ${lines}`);
    console.log(`Words:          ${words}`);
    console.log(`Unique words:   ${uniqueWords.size}`);
    console.log(`Characters:     ${chars}`);
    console.log();

    console.log('Most Common Words:');
    console.log('─'.repeat(50));
    topWords.forEach(([word, count], index) => {
      console.log(`${index + 1}. "${word}": ${count} times`);
    });

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

/**
 * BONUS SOLUTION: Multiple Files Support
 */

async function analyzeMultipleFiles() {
  const files = process.argv.slice(2);

  if (files.length === 0) {
    console.error('Usage: node script.js <file1> [file2] [file3] ...');
    process.exit(1);
  }

  const results = [];

  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf8');
      const stats = await fs.stat(file);

      const lines = content.split('\n').length;
      const words = content.split(/\s+/).filter(Boolean).length;
      const chars = content.length;

      results.push({
        file: path.basename(file),
        lines,
        words,
        chars,
        size: stats.size
      });

    } catch (err) {
      console.error(`Error reading ${file}:`, err.message);
    }
  }

  // Display results in a table
  console.log('File Analysis Results:');
  console.log('═'.repeat(70));
  console.log('File'.padEnd(30), 'Lines'.padStart(8), 'Words'.padStart(8), 'Chars'.padStart(10));
  console.log('─'.repeat(70));

  results.forEach(r => {
    console.log(
      r.file.padEnd(30),
      r.lines.toLocaleString().padStart(8),
      r.words.toLocaleString().padStart(8),
      r.chars.toLocaleString().padStart(10)
    );
  });

  console.log('═'.repeat(70));

  // Totals
  const totals = results.reduce((acc, r) => ({
    lines: acc.lines + r.lines,
    words: acc.words + r.words,
    chars: acc.chars + r.chars
  }), { lines: 0, words: 0, chars: 0 });

  console.log(
    'TOTAL'.padEnd(30),
    totals.lines.toLocaleString().padStart(8),
    totals.words.toLocaleString().padStart(8),
    totals.chars.toLocaleString().padStart(10)
  );
  console.log('═'.repeat(70));
}

/**
 * KEY LEARNING POINTS:
 *
 * 1. Line Counting Edge Cases:
 *    - Empty file: 0 lines
 *    - "Hello" (no newline): 1 line
 *    - "Hello\n" (ends with newline): 1 line
 *    - "\n" (just newline): 1 line
 *    - "Line1\nLine2" (no trailing newline): 2 lines
 *    - "Line1\nLine2\n" (trailing newline): 2 lines
 *
 * 2. Word Counting:
 *    - Use .split(/\s+/) to split by any whitespace
 *    - Use .filter(Boolean) to remove empty strings
 *    - Consider punctuation (optional)
 *
 * 3. Regular Expressions:
 *    - \s matches any whitespace (space, tab, newline)
 *    - \s+ matches one or more whitespace characters
 *    - /\n/g matches all newlines (g = global)
 *
 * 4. String Methods:
 *    - .split(delimiter) - split into array
 *    - .match(regex) - find matches
 *    - .replace(regex, replacement) - replace text
 *    - .trim() - remove leading/trailing whitespace
 *
 * 5. Number Formatting:
 *    - .toLocaleString() - adds commas (1234 → 1,234)
 *    - .toFixed(n) - fixed decimal places
 */

/**
 * COMMON MISTAKES TO AVOID:
 *
 * ❌ Naive line counting:
 *    const lines = content.split('\n').length;
 *    // Always returns at least 1, even for empty files
 *
 * ✅ Correct:
 *    const lines = content ? content.split('\n').length : 0;
 *
 * ❌ Not filtering empty strings:
 *    const words = content.split(/\s+/);
 *    // Includes empty strings at start/end
 *
 * ✅ Filter:
 *    const words = content.split(/\s+/).filter(Boolean);
 *
 * ❌ Ignoring file encoding:
 *    const content = await fs.readFile(file); // Returns Buffer!
 *
 * ✅ Specify encoding:
 *    const content = await fs.readFile(file, 'utf8');
 */

/**
 * ENHANCEMENT IDEAS:
 *
 * 1. Reading Level Calculation:
 *    // Flesch-Kincaid Grade Level
 *    const sentences = content.split(/[.!?]+/).length;
 *    const syllables = countSyllables(content);
 *    const grade = 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59;
 *
 * 2. Language Detection:
 *    // Detect programming language by extension
 *    const ext = path.extname(filename);
 *    if (ext === '.js') {
 *      // Count functions, classes, etc.
 *    }
 *
 * 3. Sentiment Analysis:
 *    // Count positive vs negative words
 *
 * 4. JSON/CSV Output:
 *    console.log(JSON.stringify({ lines, words, chars }));
 *
 * 5. Streaming for Large Files:
 *    // For files > 100MB, use streams
 *    const readline = require('readline');
 *    const stream = fs.createReadStream(file);
 *    const rl = readline.createInterface({ input: stream });
 */

/**
 * REAL-WORLD APPLICATIONS:
 *
 * - Word processor statistics
 * - Code metrics tools
 * - SEO content analysis
 * - Academic writing tools
 * - Log file analysis
 * - Data quality checks
 */
