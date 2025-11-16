/**
 * Example 8: Batch File Operations
 *
 * Demonstrates processing multiple files efficiently.
 *
 * Key Concepts:
 * - Parallel vs sequential processing
 * - Batch operations with Promise.all()
 * - Progress tracking
 * - Error handling in batch operations
 */

const fs = require('fs').promises;
const path = require('path');

async function demonstrateBatchOperations() {
  console.log('Batch File Operations\n');
  console.log('═'.repeat(50));

  try {
    // Setup: Create test files
    const testDir = path.join(__dirname, 'test-batch');
    await fs.mkdir(testDir, { recursive: true });

    const fileCount = 20;
    const files = [];

    for (let i = 1; i <= fileCount; i++) {
      const filename = `file${i.toString().padStart(2, '0')}.txt`;
      files.push(filename);
      await fs.writeFile(
        path.join(testDir, filename),
        `Content of file ${i}\n`.repeat(100)
      );
    }

    console.log(`Created ${fileCount} test files\n`);

    // Example 1: Sequential processing
    console.log('1. Sequential Processing');
    console.log('─'.repeat(50));

    async function processSequential(dir, files) {
      const startTime = Date.now();
      const results = [];

      for (const file of files) {
        const filePath = path.join(dir, file);
        const content = await fs.readFile(filePath, 'utf8');
        results.push({
          file,
          size: content.length,
          lines: content.split('\n').length
        });
      }

      const duration = Date.now() - startTime;
      return { results, duration };
    }

    const seqResult = await processSequential(testDir, files.slice(0, 10));
    console.log(`Processed ${seqResult.results.length} files sequentially`);
    console.log(`Time: ${seqResult.duration}ms`);

    // Example 2: Parallel processing
    console.log('\n2. Parallel Processing');
    console.log('─'.repeat(50));

    async function processParallel(dir, files) {
      const startTime = Date.now();

      const promises = files.map(async (file) => {
        const filePath = path.join(dir, file);
        const content = await fs.readFile(filePath, 'utf8');
        return {
          file,
          size: content.length,
          lines: content.split('\n').length
        };
      });

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      return { results, duration };
    }

    const parResult = await processParallel(testDir, files.slice(0, 10));
    console.log(`Processed ${parResult.results.length} files in parallel`);
    console.log(`Time: ${parResult.duration}ms`);
    console.log(`Speedup: ${(seqResult.duration / parResult.duration).toFixed(2)}x`);

    // Example 3: Batch processing with limit (concurrency control)
    console.log('\n3. Controlled Concurrency');
    console.log('─'.repeat(50));

    async function processBatch(dir, files, batchSize = 5) {
      const results = [];
      const startTime = Date.now();

      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        console.log(`  Processing batch ${Math.floor(i / batchSize) + 1}...`);

        const batchPromises = batch.map(async (file) => {
          const filePath = path.join(dir, file);
          const content = await fs.readFile(filePath, 'utf8');
          return {
            file,
            size: content.length
          };
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }

      const duration = Date.now() - startTime;
      return { results, duration };
    }

    const batchResult = await processBatch(testDir, files, 5);
    console.log(`\nProcessed ${batchResult.results.length} files in batches`);
    console.log(`Time: ${batchResult.duration}ms`);

    // Example 4: Batch copy with progress
    console.log('\n4. Batch Copy with Progress');
    console.log('─'.repeat(50));

    const copyDir = path.join(__dirname, 'test-batch-copy');
    await fs.mkdir(copyDir, { recursive: true });

    async function batchCopyWithProgress(srcDir, destDir, files) {
      let completed = 0;

      const promises = files.map(async (file) => {
        const srcPath = path.join(srcDir, file);
        const destPath = path.join(destDir, file);

        await fs.copyFile(srcPath, destPath);
        completed++;

        const percent = ((completed / files.length) * 100).toFixed(0);
        process.stdout.write(`\r  Progress: ${percent}% (${completed}/${files.length})`);
      });

      await Promise.all(promises);
      console.log(); // New line after progress
    }

    await batchCopyWithProgress(testDir, copyDir, files);
    console.log('✓ Batch copy complete');

    // Example 5: Batch rename
    console.log('\n5. Batch Rename');
    console.log('─'.repeat(50));

    async function batchRename(dir, pattern) {
      const files = await fs.readdir(dir);
      let renamed = 0;

      for (const file of files) {
        const oldPath = path.join(dir, file);
        const parsed = path.parse(file);
        const newName = pattern(parsed);
        const newPath = path.join(dir, newName);

        if (oldPath !== newPath) {
          await fs.rename(oldPath, newPath);
          renamed++;
        }
      }

      return renamed;
    }

    // Rename files to uppercase
    const renamedCount = await batchRename(copyDir, (parsed) => {
      return `${parsed.name.toUpperCase()}${parsed.ext}`;
    });

    console.log(`Renamed ${renamedCount} files to uppercase`);

    // Example 6: Batch delete with filtering
    console.log('\n6. Batch Delete with Filter');
    console.log('─'.repeat(50));

    async function batchDelete(dir, filter) {
      const files = await fs.readdir(dir);
      const toDelete = files.filter(filter);

      console.log(`Files to delete: ${toDelete.length}`);

      const promises = toDelete.map(async (file) => {
        const filePath = path.join(dir, file);
        await fs.unlink(filePath);
        console.log(`  Deleted: ${file}`);
      });

      await Promise.all(promises);
      return toDelete.length;
    }

    // Delete files with numbers > 10 in their name
    const deleted = await batchDelete(copyDir, (file) => {
      const match = file.match(/FILE(\d+)/);
      return match && parseInt(match[1]) > 10;
    });

    console.log(`\nDeleted ${deleted} files`);

    // Example 7: Batch processing with error handling
    console.log('\n7. Batch Processing with Error Handling');
    console.log('─'.repeat(50));

    async function batchProcessSafe(dir, files, processor) {
      const results = {
        succeeded: [],
        failed: []
      };

      const promises = files.map(async (file) => {
        try {
          const result = await processor(path.join(dir, file));
          results.succeeded.push({ file, result });
        } catch (err) {
          results.failed.push({ file, error: err.message });
        }
      });

      await Promise.all(promises);
      return results;
    }

    // Try to process files (some may not exist)
    const allFiles = [...files, 'nonexistent1.txt', 'nonexistent2.txt'];

    const processResults = await batchProcessSafe(testDir, allFiles, async (filePath) => {
      const stats = await fs.stat(filePath);
      return { size: stats.size };
    });

    console.log(`Succeeded: ${processResults.succeeded.length}`);
    console.log(`Failed: ${processResults.failed.length}`);

    if (processResults.failed.length > 0) {
      console.log('\nFailures:');
      processResults.failed.forEach(f => {
        console.log(`  ${f.file}: ${f.error}`);
      });
    }

    // Example 8: Batch statistics
    console.log('\n8. Batch Statistics');
    console.log('─'.repeat(50));

    async function gatherStats(dir) {
      const files = await fs.readdir(dir);

      const statsPromises = files.map(async (file) => {
        const filePath = path.join(dir, file);
        const stats = await fs.stat(filePath);

        if (stats.isFile()) {
          return {
            name: file,
            size: stats.size,
            modified: stats.mtime
          };
        }
        return null;
      });

      const allStats = (await Promise.all(statsPromises)).filter(Boolean);

      const totalSize = allStats.reduce((sum, s) => sum + s.size, 0);
      const avgSize = totalSize / allStats.length;
      const largest = allStats.reduce((max, s) => s.size > max.size ? s : max);
      const smallest = allStats.reduce((min, s) => s.size < min.size ? s : min);

      return {
        count: allStats.length,
        totalSize,
        avgSize,
        largest,
        smallest
      };
    }

    const stats = await gatherStats(testDir);

    console.log('Directory Statistics:');
    console.log(`  Files: ${stats.count}`);
    console.log(`  Total size: ${formatBytes(stats.totalSize)}`);
    console.log(`  Average size: ${formatBytes(stats.avgSize)}`);
    console.log(`  Largest: ${stats.largest.name} (${formatBytes(stats.largest.size)})`);
    console.log(`  Smallest: ${stats.smallest.name} (${formatBytes(stats.smallest.size)})`);

    // Cleanup
    console.log('\n9. Cleanup');
    console.log('─'.repeat(50));

    await fs.rm(testDir, { recursive: true, force: true });
    await fs.rm(copyDir, { recursive: true, force: true });
    console.log('✓ Cleanup complete');

  } catch (err) {
    console.error('Error:', err.message);
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

demonstrateBatchOperations();

/**
 * Batch Processing Strategies:
 *
 * 1. Sequential:
 *    - One at a time
 *    - Predictable order
 *    - Slower but safer
 *
 * 2. Parallel (Promise.all):
 *    - All at once
 *    - Fastest for I/O
 *    - Can overwhelm system
 *
 * 3. Batched:
 *    - Groups of N
 *    - Controlled concurrency
 *    - Best balance
 *
 * 4. Queue-based:
 *    - Worker pool
 *    - Advanced control
 *    - Production-ready
 */

/**
 * When to Use Each:
 *
 * Sequential:
 * - Order matters
 * - Operations depend on each other
 * - Limited resources
 *
 * Parallel:
 * - Independent operations
 * - I/O bound tasks
 * - Small number of files
 *
 * Batched:
 * - Large number of files
 * - Need concurrency control
 * - Resource constraints
 */

/**
 * Performance Tips:
 *
 * ✓ Use parallel for I/O operations
 * ✓ Batch processing for large sets
 * ✓ Handle errors individually
 * ✓ Show progress for long operations
 * ✓ Use streams for very large files
 *
 * ✗ Don't process all files at once (thousands)
 * ✗ Don't ignore errors in batch
 * ✗ Don't block event loop
 */
