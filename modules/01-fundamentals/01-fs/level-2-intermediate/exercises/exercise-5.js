/**
 * Exercise 5: Build a Directory Size Calculator
 *
 * DIFFICULTY: ⭐⭐ Medium
 * TIME: 20-25 minutes
 *
 * OBJECTIVE:
 * Create a tool that calculates and displays directory sizes recursively.
 *
 * REQUIREMENTS:
 * 1. Accept a directory path as command-line argument
 * 2. Calculate size of all files recursively
 * 3. Show size breakdown by subdirectory
 * 4. Display human-readable sizes (KB, MB, GB)
 * 5. Show file count in each directory
 * 6. Sort directories by size (largest first)
 * 7. Handle errors gracefully (permissions, symlinks, etc.)
 *
 * OUTPUT FORMAT:
 * Directory Size Report
 * =====================
 * Path: /path/to/directory
 *
 * Subdirectory                    Files    Size
 * ─────────────────────────────────────────────
 * node_modules/                   1,234    45.2 MB
 * src/                              156     2.3 MB
 * public/                            89     1.1 MB
 * tests/                             45   512.0 KB
 * ─────────────────────────────────────────────
 * TOTAL                           1,524    49.1 MB
 *
 * BONUS CHALLENGES:
 * - Add --depth option to limit recursion depth
 * - Add --min-size filter to show only large directories
 * - Show percentage of total for each subdirectory
 * - Add visualization (ASCII bar chart)
 * - Support multiple directories for comparison
 * - Add --exclude option to skip certain directories
 * - Find and report largest individual files
 *
 * HINTS:
 * - Use recursive function to traverse directories
 * - Track size at each level of recursion
 * - Use Map or object to store directory sizes
 * - Use fs.stat() to get file sizes
 */

const fs = require('fs').promises;
const path = require('path');

// TODO: Implement your solution here

async function calculateDirectorySize(dirPath) {
  // Your code here
  // 1. Recursively traverse directory
  // 2. Sum up all file sizes
  // 3. Track subdirectory sizes separately
  // 4. Count files
  // 5. Return detailed breakdown
}

async function analyzeDi rectory(dirPath, options = {}) {
  // Your code here
  // Main analysis function
}

function formatBytes(bytes) {
  // Your code here
  // Convert bytes to human-readable format
}

function displayReport(analysis) {
  // Your code here
  // Format and display the analysis results
}

async function main() {
  // Your code here
  // 1. Parse arguments
  // 2. Analyze directory
  // 3. Display report
}

// main();

/**
 * TESTING YOUR SOLUTION:
 *
 * 1. Create test directory structure:
 *    mkdir -p test-size/{large,medium,small}
 *    dd if=/dev/zero of=test-size/large/big.dat bs=1M count=10
 *    dd if=/dev/zero of=test-size/medium/mid.dat bs=1K count=500
 *    dd if=/dev/zero of=test-size/small/tiny.dat bs=1 count=100
 *
 * 2. Run analysis:
 *    node exercise-5.js test-size
 *
 * 3. Expected output:
 *    Analyzing directory: test-size/
 *
 *    Directory Size Report
 *    ═════════════════════════════════════════════
 *    Path: test-size
 *
 *    Subdirectory              Files        Size
 *    ─────────────────────────────────────────────
 *    large/                        1    10.00 MB
 *    medium/                       1   500.00 KB
 *    small/                        1   100.00 B
 *    ─────────────────────────────────────────────
 *    TOTAL                         3    10.49 MB
 *
 * 4. Test with depth limit:
 *    node exercise-5.js test-size --depth 1
 *
 * 5. Test with size filter:
 *    node exercise-5.js test-size --min-size 1MB
 */

/**
 * EXAMPLE WITH PERCENTAGES:
 *
 * Directory Size Report
 * ═════════════════════════════════════════════════════
 * Path: /my-project
 *
 * Subdirectory          Files        Size    Percent
 * ─────────────────────────────────────────────────────
 * node_modules/         1,234    45.2 MB     92.0%
 * src/                    156     2.3 MB      4.7%
 * public/                  89     1.1 MB      2.2%
 * tests/                   45   512.0 KB      1.0%
 * config/                   5    48.0 KB      0.1%
 * ─────────────────────────────────────────────────────
 * TOTAL                 1,529    49.2 MB    100.0%
 *
 * Largest files:
 *   1. node_modules/package/large.bin - 15.2 MB
 *   2. node_modules/other/big.dat - 8.5 MB
 *   3. public/video.mp4 - 1.1 MB
 */

/**
 * RECURSIVE SIZE CALCULATION:
 *
 * async function getDirSize(dirPath) {
 *   let totalSize = 0;
 *   const subdirs = {};
 *
 *   const entries = await fs.readdir(dirPath, { withFileTypes: true });
 *
 *   for (const entry of entries) {
 *     const fullPath = path.join(dirPath, entry.name);
 *
 *     if (entry.isDirectory()) {
 *       const dirInfo = await getDirSize(fullPath);
 *       subdirs[entry.name] = dirInfo;
 *       totalSize += dirInfo.size;
 *     } else {
 *       const stats = await fs.stat(fullPath);
 *       totalSize += stats.size;
 *     }
 *   }
 *
 *   return { size: totalSize, subdirs };
 * }
 */

/**
 * SIZE FORMATTING:
 *
 * function formatBytes(bytes) {
 *   if (bytes === 0) return '0 B';
 *
 *   const k = 1024;
 *   const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
 *   const i = Math.floor(Math.log(bytes) / Math.log(k));
 *
 *   return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
 * }
 */

/**
 * VISUALIZATION (BONUS):
 *
 * function createBarChart(size, maxSize, width = 30) {
 *   const filled = Math.round((size / maxSize) * width);
 *   const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
 *   return bar;
 * }
 *
 * // Usage:
 * node_modules/ ████████████████████░░░░░░░░░░ 45.2 MB (92%)
 * src/          ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░  2.3 MB (5%)
 */

/**
 * ERROR HANDLING:
 *
 * Handle these scenarios:
 * - Permission denied for subdirectory
 * - Symbolic links (don't follow infinite loops)
 * - Very deep directory structures
 * - Special files (sockets, FIFOs)
 * - Files being modified during scan
 */

/**
 * LEARNING NOTES:
 *
 * Write down what you learned:
 * - How do you calculate directory sizes recursively?
 * - What's the best way to aggregate data from subdirectories?
 * - How do you format numbers for human readability?
 * - What edge cases need to be handled?
 */
