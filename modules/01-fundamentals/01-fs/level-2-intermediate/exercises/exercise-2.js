/**
 * Exercise 2: Build a File Search Utility with Filters
 *
 * DIFFICULTY: ⭐⭐ Medium
 * TIME: 20-25 minutes
 *
 * OBJECTIVE:
 * Create a command-line file search tool that can find files based on various criteria.
 *
 * REQUIREMENTS:
 * 1. Accept a directory path as the first argument
 * 2. Search recursively through all subdirectories
 * 3. Support filtering by:
 *    - File name pattern (e.g., "*.js", "test*")
 *    - File extension (e.g., ".txt", ".md")
 *    - Minimum/maximum file size
 *    - Modified date (newer/older than X days)
 * 4. Display results with relative paths
 * 5. Show count of matching files
 * 6. Handle errors gracefully
 *
 * COMMAND-LINE INTERFACE:
 * node exercise-2.js <directory> [options]
 *
 * Options:
 * --name <pattern>     File name pattern
 * --ext <extension>    File extension
 * --min-size <bytes>   Minimum file size
 * --max-size <bytes>   Maximum file size
 * --newer <days>       Modified within last N days
 * --older <days>       Modified more than N days ago
 *
 * BONUS CHALLENGES:
 * - Support multiple filters at once (AND logic)
 * - Add --sort option (name, size, date)
 * - Add --limit option to limit results
 * - Support regex patterns for file names
 * - Add --exclude option to exclude directories
 * - Show file sizes and dates in results
 *
 * HINTS:
 * - Use process.argv to parse command-line arguments
 * - Use recursive directory walking
 * - Use Array.filter() to apply multiple filters
 * - Use RegExp for pattern matching
 */

const fs = require('fs').promises;
const path = require('path');

// TODO: Implement your solution here

async function searchFiles(directory, filters = {}) {
  // Your code here
  // 1. Validate directory exists
  // 2. Recursively collect all files
  // 3. Apply filters
  // 4. Return matching files with metadata
}

function parseArguments(args) {
  // Your code here
  // Parse command-line arguments into filters object
}

async function main() {
  // Your code here
  // 1. Parse arguments
  // 2. Search files
  // 3. Display results
}

// main();

/**
 * TESTING YOUR SOLUTION:
 *
 * 1. Create test directory structure:
 *    mkdir -p test-search/{src,docs,images}
 *    echo "code" > test-search/src/app.js
 *    echo "code" > test-search/src/utils.js
 *    echo "docs" > test-search/docs/README.md
 *    echo "img" > test-search/images/logo.png
 *
 * 2. Test basic search:
 *    node exercise-2.js test-search
 *    Expected: Lists all files
 *
 * 3. Test with extension filter:
 *    node exercise-2.js test-search --ext .js
 *    Expected: Only .js files
 *
 * 4. Test with name pattern:
 *    node exercise-2.js test-search --name "app*"
 *    Expected: Files starting with "app"
 *
 * 5. Test with size filter:
 *    node exercise-2.js test-search --min-size 100
 *    Expected: Files larger than 100 bytes
 *
 * 6. Test with date filter:
 *    node exercise-2.js test-search --newer 1
 *    Expected: Files modified in last day
 */

/**
 * EXAMPLE OUTPUT:
 *
 * Searching in: test-search/
 * Filters:
 *   Extension: .js
 *   Min size: 100 bytes
 *
 * Results:
 * ─────────────────────────────────────
 * src/app.js (512 bytes, modified 2 hours ago)
 * src/utils.js (1.2 KB, modified 1 day ago)
 * ─────────────────────────────────────
 * Found 2 matching files
 */

/**
 * FILTER EXAMPLES:
 *
 * 1. Name pattern matching:
 *    if (filters.name) {
 *      const pattern = filters.name.replace(/\*/g, '.*');
 *      const regex = new RegExp(pattern, 'i');
 *      matches = matches.filter(f => regex.test(path.basename(f)));
 *    }
 *
 * 2. Extension filter:
 *    if (filters.ext) {
 *      matches = matches.filter(f => path.extname(f) === filters.ext);
 *    }
 *
 * 3. Size filter:
 *    if (filters.minSize) {
 *      matches = matches.filter(f => f.size >= filters.minSize);
 *    }
 *
 * 4. Date filter:
 *    if (filters.newer) {
 *      const cutoff = Date.now() - (filters.newer * 24 * 60 * 60 * 1000);
 *      matches = matches.filter(f => f.mtime > cutoff);
 *    }
 */

/**
 * LEARNING NOTES:
 *
 * Write down what you learned:
 * - How do you parse command-line arguments?
 * - What's the best way to implement multiple filters?
 * - How do you convert glob patterns to regex?
 * - How do you calculate file age?
 */
