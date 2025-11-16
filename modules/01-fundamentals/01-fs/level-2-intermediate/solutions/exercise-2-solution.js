/**
 * Exercise 2 Solution: File Search Utility with Filters
 *
 * Complete command-line file search tool with multiple filter options.
 */

const fs = require('fs').promises;
const path = require('path');

async function searchFiles(directory, filters = {}) {
  const results = [];

  async function walk(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await walk(fullPath);
        } else {
          const stats = await fs.stat(fullPath);

          results.push({
            path: fullPath,
            name: entry.name,
            size: stats.size,
            mtime: stats.mtime,
            ext: path.extname(entry.name)
          });
        }
      }
    } catch (err) {
      // Skip directories we can't read
      if (err.code !== 'EACCES') {
        console.error(`Error reading ${dir}:`, err.message);
      }
    }
  }

  await walk(directory);

  // Apply filters
  let filtered = results;

  if (filters.name) {
    const pattern = filters.name.replace(/\*/g, '.*').replace(/\?/g, '.');
    const regex = new RegExp(`^${pattern}$`, 'i');
    filtered = filtered.filter(f => regex.test(f.name));
  }

  if (filters.ext) {
    filtered = filtered.filter(f => f.ext === filters.ext);
  }

  if (filters.minSize) {
    filtered = filtered.filter(f => f.size >= filters.minSize);
  }

  if (filters.maxSize) {
    filtered = filtered.filter(f => f.size <= filters.maxSize);
  }

  if (filters.newer) {
    const cutoff = Date.now() - (filters.newer * 24 * 60 * 60 * 1000);
    filtered = filtered.filter(f => f.mtime.getTime() > cutoff);
  }

  if (filters.older) {
    const cutoff = Date.now() - (filters.older * 24 * 60 * 60 * 1000);
    filtered = filtered.filter(f => f.mtime.getTime() < cutoff);
  }

  // Sort if specified
  if (filters.sort) {
    filtered = sortResults(filtered, filters.sort);
  }

  // Limit if specified
  if (filters.limit) {
    filtered = filtered.slice(0, filters.limit);
  }

  return { results: filtered, baseDir: directory };
}

function sortResults(results, sortBy) {
  switch (sortBy) {
    case 'name':
      return results.sort((a, b) => a.name.localeCompare(b.name));
    case 'size':
      return results.sort((a, b) => b.size - a.size);
    case 'date':
      return results.sort((a, b) => b.mtime - a.mtime);
    default:
      return results;
  }
}

function parseArguments(args) {
  const filters = {};
  const directory = args[0];

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--name':
        filters.name = args[++i];
        break;
      case '--ext':
        filters.ext = args[++i];
        if (!filters.ext.startsWith('.')) {
          filters.ext = '.' + filters.ext;
        }
        break;
      case '--min-size':
        filters.minSize = parseInt(args[++i]);
        break;
      case '--max-size':
        filters.maxSize = parseInt(args[++i]);
        break;
      case '--newer':
        filters.newer = parseInt(args[++i]);
        break;
      case '--older':
        filters.older = parseInt(args[++i]);
        break;
      case '--sort':
        filters.sort = args[++i];
        break;
      case '--limit':
        filters.limit = parseInt(args[++i]);
        break;
    }
  }

  return { directory, filters };
}

function displayResults(searchResults) {
  const { results, baseDir } = searchResults;

  console.log(`\nSearching in: ${baseDir}`);
  console.log('\nResults:');
  console.log('─'.repeat(70));

  if (results.length === 0) {
    console.log('No matching files found.');
  } else {
    results.forEach(file => {
      const relativePath = path.relative(baseDir, file.path);
      const size = formatBytes(file.size);
      const ago = getTimeAgo(file.mtime);

      console.log(`${relativePath.padEnd(40)} ${size.padStart(10)}  ${ago}`);
    });
  }

  console.log('─'.repeat(70));
  console.log(`Found ${results.length} matching file${results.length !== 1 ? 's' : ''}`);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getTimeAgo(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };

  for (const [name, seconds_in_interval] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / seconds_in_interval);
    if (interval >= 1) {
      return `${interval} ${name}${interval !== 1 ? 's' : ''} ago`;
    }
  }

  return 'just now';
}

async function main() {
  try {
    const args = process.argv.slice(2);

    if (args.length === 0) {
      console.log('Usage: node exercise-2-solution.js <directory> [options]');
      console.log('\nOptions:');
      console.log('  --name <pattern>     File name pattern (* and ? wildcards)');
      console.log('  --ext <extension>    File extension (.txt, .js, etc.)');
      console.log('  --min-size <bytes>   Minimum file size');
      console.log('  --max-size <bytes>   Maximum file size');
      console.log('  --newer <days>       Modified within last N days');
      console.log('  --older <days>       Modified more than N days ago');
      console.log('  --sort <field>       Sort by: name, size, date');
      console.log('  --limit <number>     Limit number of results');
      console.log('\nExamples:');
      console.log('  node exercise-2-solution.js . --ext .js');
      console.log('  node exercise-2-solution.js . --name "test*" --newer 7');
      console.log('  node exercise-2-solution.js . --min-size 1024 --sort size');
      process.exit(0);
    }

    const { directory, filters } = parseArguments(args);

    // Verify directory exists
    try {
      await fs.access(directory);
    } catch {
      console.error(`Error: Directory not found: ${directory}`);
      process.exit(1);
    }

    const results = await searchFiles(directory, filters);
    displayResults(results);

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();

/**
 * KEY POINTS:
 *
 * 1. Pattern Matching:
 *    - Convert glob patterns (* and ?) to regex
 *    - Use case-insensitive matching
 *
 * 2. Multiple Filters:
 *    - Apply each filter sequentially
 *    - Combine with AND logic
 *    - Each filter reduces result set
 *
 * 3. Performance:
 *    - Collect all files first
 *    - Then apply filters
 *    - More efficient than filtering during walk
 */
