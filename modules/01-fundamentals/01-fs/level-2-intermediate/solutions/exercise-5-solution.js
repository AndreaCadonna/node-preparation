/**
 * Exercise 5 Solution: Directory Size Calculator
 *
 * Calculates and displays directory sizes recursively with visualization.
 */

const fs = require('fs').promises;
const path = require('path');

async function analyzeDirectory(dirPath, options = {}) {
  const { depth = Infinity, minSize = 0, maxDepth = 10 } = options;

  console.log(`Analyzing directory: ${dirPath}\n`);

  const startTime = Date.now();
  const analysis = await calculateDirectorySize(dirPath, 0, Math.min(depth, maxDepth));
  const duration = Date.now() - startTime;

  analysis.duration = duration;

  return analysis;
}

async function calculateDirectorySize(dirPath, currentDepth = 0, maxDepth = 10) {
  if (currentDepth > maxDepth) {
    return { size: 0, files: 0, subdirs: {} };
  }

  let totalSize = 0;
  let fileCount = 0;
  const subdirs = {};

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      try {
        if (entry.isDirectory()) {
          const dirInfo = await calculateDirectorySize(fullPath, currentDepth + 1, maxDepth);
          subdirs[entry.name] = dirInfo;
          totalSize += dirInfo.size;
          fileCount += dirInfo.files;
        } else if (entry.isFile()) {
          const stats = await fs.stat(fullPath);
          totalSize += stats.size;
          fileCount++;
        }
      } catch (err) {
        // Skip files we can't access
        if (err.code !== 'EACCES') {
          console.error(`Error accessing ${fullPath}:`, err.message);
        }
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${dirPath}:`, err.message);
  }

  return { size: totalSize, files: fileCount, subdirs };
}

function displayReport(analysis, dirPath, options = {}) {
  const { showPercentage = true, showChart = false } = options;

  console.log('Directory Size Report');
  console.log('═'.repeat(70));
  console.log(`Path: ${dirPath}`);
  console.log(`Analysis time: ${analysis.duration}ms\n`);

  // Get all subdirectories with their sizes
  const subdirList = [];

  function collectSubdirs(subdirs, basePath = '') {
    for (const [name, info] of Object.entries(subdirs)) {
      const fullName = basePath ? `${basePath}/${name}` : name;
      subdirList.push({
        name: fullName,
        size: info.size,
        files: info.files
      });

      // Recursively collect nested subdirs
      if (Object.keys(info.subdirs).length > 0) {
        collectSubdirs(info.subdirs, fullName);
      }
    }
  }

  collectSubdirs(analysis.subdirs);

  // Sort by size (largest first)
  subdirList.sort((a, b) => b.size - a.size);

  // Display table
  console.log('Subdirectory'.padEnd(35) + 'Files'.padStart(10) + 'Size'.padStart(12));

  if (showPercentage) {
    console.log(''.padEnd(35) + ''.padEnd(10) + 'Percent'.padStart(12));
  }

  console.log('─'.repeat(70));

  subdirList.forEach(subdir => {
    const name = subdir.name.length > 30
      ? '...' + subdir.name.slice(-27)
      : subdir.name;
    const nameCol = (name + '/').padEnd(35);
    const filesCol = subdir.files.toLocaleString().padStart(10);
    const sizeCol = formatBytes(subdir.size).padStart(12);

    let line = nameCol + filesCol + sizeCol;

    if (showPercentage && analysis.size > 0) {
      const percent = ((subdir.size / analysis.size) * 100).toFixed(1);
      line += `  (${percent}%)`;
    }

    console.log(line);

    if (showChart && analysis.size > 0) {
      const chart = createBarChart(subdir.size, analysis.size, 30);
      console.log(''.padEnd(35) + chart);
    }
  });

  console.log('─'.repeat(70));

  const totalLine = 'TOTAL'.padEnd(35) +
    analysis.files.toLocaleString().padStart(10) +
    formatBytes(analysis.size).padStart(12);

  console.log(totalLine);
  console.log('═'.repeat(70));
}

function findLargestFiles(dirPath, count = 10) {
  const files = [];

  async function scan(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        try {
          if (entry.isDirectory()) {
            await scan(fullPath);
          } else if (entry.isFile()) {
            const stats = await fs.stat(fullPath);
            files.push({
              path: fullPath,
              size: stats.size
            });
          }
        } catch {}
      }
    } catch {}
  }

  return scan(dirPath).then(() => {
    files.sort((a, b) => b.size - a.size);
    return files.slice(0, count);
  });
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function createBarChart(size, maxSize, width = 30) {
  const filled = Math.round((size / maxSize) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node exercise-5-solution.js <directory> [options]');
    console.log('\nOptions:');
    console.log('  --depth <n>      Limit recursion depth');
    console.log('  --min-size <n>   Only show directories larger than N bytes');
    console.log('  --chart          Show bar chart visualization');
    console.log('  --largest        Show largest files');
    console.log('\nExamples:');
    console.log('  node exercise-5-solution.js .');
    console.log('  node exercise-5-solution.js . --depth 2');
    console.log('  node exercise-5-solution.js . --chart');
    console.log('  node exercise-5-solution.js . --largest');
    process.exit(0);
  }

  const dirPath = path.resolve(args[0]);
  const options = {
    depth: Infinity,
    minSize: 0,
    showChart: args.includes('--chart'),
    showPercentage: true
  };

  // Parse depth option
  const depthIndex = args.indexOf('--depth');
  if (depthIndex !== -1 && args[depthIndex + 1]) {
    options.depth = parseInt(args[depthIndex + 1]);
  }

  // Parse min-size option
  const minSizeIndex = args.indexOf('--min-size');
  if (minSizeIndex !== -1 && args[minSizeIndex + 1]) {
    options.minSize = parseInt(args[minSizeIndex + 1]);
  }

  try {
    // Verify directory exists
    await fs.access(dirPath);

    // Analyze directory
    const analysis = await analyzeDirectory(dirPath, options);

    // Display report
    displayReport(analysis, dirPath, options);

    // Show largest files if requested
    if (args.includes('--largest')) {
      console.log('\nLargest Files:');
      console.log('═'.repeat(70));

      const largestFiles = await findLargestFiles(dirPath, 10);

      largestFiles.forEach((file, index) => {
        const relativePath = path.relative(dirPath, file.path);
        console.log(`${(index + 1).toString().padStart(3)}. ${relativePath.padEnd(50)} ${formatBytes(file.size).padStart(10)}`);
      });

      console.log('═'.repeat(70));
    }

  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error(`Error: Directory not found: ${dirPath}`);
    } else {
      console.error('Error:', err.message);
    }
    process.exit(1);
  }
}

main();

/**
 * KEY POINTS:
 *
 * 1. Recursive Calculation:
 *    - Depth-first traversal
 *    - Aggregate sizes bottom-up
 *    - Track file counts
 *
 * 2. Visualization:
 *    - Human-readable sizes
 *    - Percentage calculations
 *    - ASCII bar charts
 *
 * 3. Safety:
 *    - Depth limits
 *    - Error handling per directory
 *    - Skip inaccessible files
 *
 * 4. Performance:
 *    - Single pass collection
 *    - Efficient sorting
 *    - Optional depth limiting
 */
