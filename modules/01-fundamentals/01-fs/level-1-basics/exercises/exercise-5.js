/**
 * Exercise 5: Count Lines in a Text File
 *
 * DIFFICULTY: ⭐⭐ Medium
 * TIME: 20-25 minutes
 *
 * OBJECTIVE:
 * Create a utility that analyzes a text file and provides detailed statistics.
 *
 * REQUIREMENTS:
 * 1. Accept a filename as a command-line argument
 * 2. Read the file contents
 * 3. Count the number of lines
 * 4. Count the number of words
 * 5. Count the number of characters
 * 6. Display the statistics in a formatted way
 * 7. Handle empty files and files with trailing newlines correctly
 *
 * BONUS CHALLENGES:
 * - Count unique words
 * - Find the longest line
 * - Calculate average words per line
 * - Show most common words
 * - Support multiple files
 *
 * HINTS:
 * - Use .split('\n') to split by lines
 * - Use .split(/\s+/) to split by whitespace
 * - Filter out empty strings with .filter(Boolean)
 * - Be careful with trailing newlines
 */

const fs = require('fs').promises;
const path = require('path');

// TODO: Implement the solution here

async function analyzeFile() {
  try {
    // Your code here
    // 1. Get filename from command-line arguments
    // 2. Validate filename was provided
    // 3. Read the file
    // 4. Count lines (handle edge cases)
    // 5. Count words
    // 6. Count characters
    // 7. Display formatted statistics

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

// Don't forget to call your function!
// analyzeFile();

/**
 * TESTING YOUR SOLUTION:
 *
 * 1. Create a test file:
 *    cat > test.txt << EOF
 *    Hello World
 *    This is a test file
 *    It has three lines
 *    EOF
 *
 * 2. Run your solution:
 *    node exercise-5.js test.txt
 *
 *    Expected output:
 *    File Statistics for: test.txt
 *    ─────────────────────────────────────
 *    Lines: 3
 *    Words: 10
 *    Characters: 47
 *    ─────────────────────────────────────
 *
 * 3. Test with empty file:
 *    touch empty.txt
 *    node exercise-5.js empty.txt
 *
 *    Expected output:
 *    Lines: 0
 *    Words: 0
 *    Characters: 0
 *
 * 4. Test with one-line file:
 *    echo "Single line" > single.txt
 *    node exercise-5.js single.txt
 *
 * 5. Test without argument:
 *    node exercise-5.js
 *
 *    Expected output:
 *    Usage: node exercise-5.js <filename>
 */

/**
 * EXAMPLE OUTPUT (detailed):
 * ═══════════════════════════════════════
 * File Statistics
 * ═══════════════════════════════════════
 *
 * File: test.txt
 * Size: 1,234 bytes
 *
 * Counts:
 * ─────────────────────────────────────
 * Lines:              45
 * Words:              312
 * Characters:         1,234
 * Characters (no spaces): 987
 *
 * Averages:
 * ─────────────────────────────────────
 * Words per line:     6.9
 * Characters per line: 27.4
 * Characters per word: 4.0
 *
 * Details:
 * ─────────────────────────────────────
 * Longest line:       65 characters
 * Empty lines:        3
 * ═══════════════════════════════════════
 */

/**
 * EDGE CASES TO HANDLE:
 *
 * 1. Empty file:
 *    Content: ""
 *    Lines: 0 (not 1)
 *
 * 2. Single line with newline:
 *    Content: "Hello\n"
 *    Lines: 1 (not 2)
 *
 * 3. Multiple trailing newlines:
 *    Content: "Line 1\n\n\n"
 *    Lines: 1 or 3? (decide and document)
 *
 * 4. No trailing newline:
 *    Content: "Line 1"
 *    Lines: 1
 *
 * 5. Only whitespace:
 *    Content: "   \n   \n"
 *    Words: 0
 */

/**
 * IMPLEMENTATION TIPS:
 *
 * 1. Counting Lines (Method 1):
 *    const lines = content.split('\n');
 *    const lineCount = content.trim() ? lines.length : 0;
 *
 * 2. Counting Lines (Method 2):
 *    const lineCount = (content.match(/\n/g) || []).length + 1;
 *
 * 3. Counting Words:
 *    const words = content.split(/\s+/).filter(Boolean);
 *    const wordCount = words.length;
 *
 * 4. Counting Characters:
 *    const charCount = content.length;
 *
 * 5. Non-whitespace Characters:
 *    const nonSpaceCount = content.replace(/\s/g, '').length;
 */

/**
 * BONUS IMPLEMENTATION IDEAS:
 *
 * 1. Unique Words:
 *    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
 *    console.log(`Unique words: ${uniqueWords.size}`);
 *
 * 2. Most Common Words:
 *    const frequency = {};
 *    words.forEach(word => {
 *      frequency[word] = (frequency[word] || 0) + 1;
 *    });
 *
 * 3. Longest Line:
 *    const longestLine = Math.max(...lines.map(line => line.length));
 *
 * 4. Reading Level:
 *    Calculate Flesch-Kincaid reading level
 *
 * 5. Compare Multiple Files:
 *    Accept multiple filenames and compare statistics
 */

/**
 * ADVANCED FEATURES:
 *
 * 1. File Type Detection:
 *    - Detect if file is text or binary
 *    - Skip binary files
 *
 * 2. Encoding Detection:
 *    - Handle different encodings (UTF-8, UTF-16, etc.)
 *
 * 3. Language Detection:
 *    - Detect programming language
 *    - Count code-specific metrics (functions, classes)
 *
 * 4. Output Formats:
 *    - Support JSON output
 *    - Support CSV output
 *    - Support markdown table output
 *
 * 5. Performance:
 *    - For large files, use streams instead of reading all at once
 *    - Show progress for files > 1MB
 */

/**
 * REAL-WORLD USE CASES:
 *
 * - Word processors (word count)
 * - Code analysis tools
 * - Log file analysis
 * - Documentation metrics
 * - Content analysis
 * - Academic writing tools
 */

/**
 * LEARNING NOTES:
 *
 * Write down what you learned:
 * - How do you count lines correctly?
 * - What's the difference between .split() and .match()?
 * - How do you handle edge cases?
 * - What regex patterns are useful for text analysis?
 */
