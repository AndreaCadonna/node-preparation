/**
 * Example 7: File Organization
 *
 * Demonstrates sorting, filtering, and organizing files.
 *
 * Key Concepts:
 * - File categorization
 * - Sorting by various criteria
 * - Filtering file lists
 * - Building file indexes
 */

const fs = require('fs').promises;
const path = require('path');

async function demonstrateFileOrganization() {
  console.log('File Organization Examples\n');
  console.log('═'.repeat(50));

  try {
    // Setup: Create test files with various properties
    const testDir = path.join(__dirname, 'test-organize');
    await fs.mkdir(testDir, { recursive: true });

    const testFiles = [
      { name: 'report.pdf', size: 1024 * 500, age: 1 },
      { name: 'image.jpg', size: 1024 * 1024 * 2, age: 5 },
      { name: 'document.doc', size: 1024 * 200, age: 10 },
      { name: 'data.json', size: 1024 * 50, age: 2 },
      { name: 'video.mp4', size: 1024 * 1024 * 10, age: 3 },
      { name: 'archive.zip', size: 1024 * 1024 * 5, age: 15 },
      { name: 'code.js', size: 1024 * 30, age: 1 },
      { name: 'readme.md', size: 1024 * 10, age: 7 }
    ];

    // Create files with different timestamps
    for (const file of testFiles) {
      const filePath = path.join(testDir, file.name);
      await fs.writeFile(filePath, 'x'.repeat(file.size));

      // Set modification time to simulate age
      const now = Date.now();
      const mtime = new Date(now - file.age * 24 * 60 * 60 * 1000);
      await fs.utimes(filePath, mtime, mtime);
    }

    console.log(`Created ${testFiles.length} test files\n`);

    // Example 1: List files with details
    console.log('1. File Listing with Details');
    console.log('─'.repeat(50));

    async function listFilesWithDetails(dir) {
      const files = await fs.readdir(dir);
      const details = [];

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = await fs.stat(filePath);

        if (stats.isFile()) {
          details.push({
            name: file,
            size: stats.size,
            modified: stats.mtime,
            ext: path.extname(file)
          });
        }
      }

      return details;
    }

    const fileList = await listFilesWithDetails(testDir);

    console.log('File'.padEnd(20) + 'Size'.padStart(12) + ' Modified');
    console.log('─'.repeat(50));
    fileList.forEach(f => {
      const size = formatBytes(f.size);
      const date = f.modified.toLocaleDateString();
      console.log(`${f.name.padEnd(20)}${size.padStart(12)}  ${date}`);
    });

    // Example 2: Sort files by size
    console.log('\n2. Sorting Files by Size');
    console.log('─'.repeat(50));

    const bySize = [...fileList].sort((a, b) => b.size - a.size);

    console.log('Largest files:');
    bySize.slice(0, 3).forEach(f => {
      console.log(`  ${f.name.padEnd(20)} ${formatBytes(f.size)}`);
    });

    // Example 3: Sort files by date
    console.log('\n3. Sorting Files by Date');
    console.log('─'.repeat(50));

    const byDate = [...fileList].sort((a, b) => b.modified - a.modified);

    console.log('Recently modified:');
    byDate.slice(0, 3).forEach(f => {
      console.log(`  ${f.name.padEnd(20)} ${f.modified.toLocaleString()}`);
    });

    // Example 4: Filter files by extension
    console.log('\n4. Filtering by Extension');
    console.log('─'.repeat(50));

    const imageExts = ['.jpg', '.png', '.gif', '.bmp'];
    const imageFiles = fileList.filter(f => imageExts.includes(f.ext));

    console.log(`Image files (${imageFiles.length}):`);
    imageFiles.forEach(f => console.log(`  ${f.name}`));

    // Example 5: Group files by extension
    console.log('\n5. Grouping Files by Extension');
    console.log('─'.repeat(50));

    const grouped = fileList.reduce((acc, file) => {
      const ext = file.ext || 'no extension';
      if (!acc[ext]) acc[ext] = [];
      acc[ext].push(file);
      return acc;
    }, {});

    console.log('Files by extension:');
    Object.entries(grouped).forEach(([ext, files]) => {
      console.log(`  ${ext}: ${files.length} file(s)`);
      files.forEach(f => console.log(`    - ${f.name}`));
    });

    // Example 6: Filter files by size
    console.log('\n6. Filtering by Size');
    console.log('─'.repeat(50));

    const largeFiles = fileList.filter(f => f.size > 1024 * 1024); // > 1MB

    console.log(`Large files (>1MB): ${largeFiles.length}`);
    largeFiles.forEach(f => {
      console.log(`  ${f.name.padEnd(20)} ${formatBytes(f.size)}`);
    });

    // Example 7: Filter files by age
    console.log('\n7. Filtering by Age');
    console.log('─'.repeat(50));

    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const recentFiles = fileList.filter(f => f.modified > oneDayAgo);

    console.log(`Files modified in last 24 hours: ${recentFiles.length}`);
    recentFiles.forEach(f => console.log(`  ${f.name}`));

    // Example 8: Organize files into folders by type
    console.log('\n8. Organizing Files by Type');
    console.log('─'.repeat(50));

    const fileTypes = {
      'documents': ['.pdf', '.doc', '.docx', '.txt', '.md'],
      'images': ['.jpg', '.jpeg', '.png', '.gif', '.bmp'],
      'videos': ['.mp4', '.avi', '.mkv', '.mov'],
      'archives': ['.zip', '.rar', '.tar', '.gz'],
      'code': ['.js', '.py', '.java', '.cpp', '.html', '.css'],
      'data': ['.json', '.xml', '.csv', '.sql']
    };

    async function organizeByType(sourceDir, fileTypes) {
      const files = await listFilesWithDetails(sourceDir);

      for (const [category, extensions] of Object.entries(fileTypes)) {
        const categoryFiles = files.filter(f => extensions.includes(f.ext));

        if (categoryFiles.length > 0) {
          const categoryDir = path.join(sourceDir, category);
          await fs.mkdir(categoryDir, { recursive: true });

          console.log(`\n${category}/ (${categoryFiles.length} files):`);

          for (const file of categoryFiles) {
            const oldPath = path.join(sourceDir, file.name);
            const newPath = path.join(categoryDir, file.name);

            try {
              await fs.rename(oldPath, newPath);
              console.log(`  Moved: ${file.name}`);
            } catch (err) {
              console.log(`  Failed: ${file.name} (${err.message})`);
            }
          }
        }
      }
    }

    await organizeByType(testDir, fileTypes);

    // Example 9: Create file index
    console.log('\n\n9. Creating File Index');
    console.log('─'.repeat(50));

    async function createFileIndex(dir) {
      const index = {
        createdAt: new Date().toISOString(),
        directory: dir,
        totalFiles: 0,
        totalSize: 0,
        files: []
      };

      async function scan(currentDir, relativeDir = '') {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name);
          const relativePath = path.join(relativeDir, entry.name);

          if (entry.isDirectory()) {
            await scan(fullPath, relativePath);
          } else {
            const stats = await fs.stat(fullPath);
            index.files.push({
              path: relativePath,
              size: stats.size,
              modified: stats.mtime.toISOString(),
              extension: path.extname(entry.name)
            });
            index.totalFiles++;
            index.totalSize += stats.size;
          }
        }
      }

      await scan(dir);
      return index;
    }

    const index = await createFileIndex(testDir);

    console.log('File Index:');
    console.log(`  Total files: ${index.totalFiles}`);
    console.log(`  Total size: ${formatBytes(index.totalSize)}`);
    console.log(`  Created: ${index.createdAt}`);

    // Save index to file
    const indexPath = path.join(testDir, 'index.json');
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
    console.log(`  Index saved to: ${path.basename(indexPath)}`);

    // Cleanup
    console.log('\n10. Cleanup');
    console.log('─'.repeat(50));

    await fs.rm(testDir, { recursive: true, force: true });
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

demonstrateFileOrganization();

/**
 * File Organization Patterns:
 *
 * 1. By Extension:
 *    - Group similar file types together
 *    - Easy to locate files
 *
 * 2. By Date:
 *    - Archive old files
 *    - Find recent changes
 *
 * 3. By Size:
 *    - Identify space hogs
 *    - Clean up large files
 *
 * 4. By Content Type:
 *    - Documents, images, code, etc.
 *    - Better organization
 *
 * 5. Hierarchical:
 *    - Year/Month/Day folders
 *    - Project-based structure
 */

/**
 * Sorting Criteria:
 *
 * - Name (alphabetical)
 * - Size (largest/smallest first)
 * - Date (newest/oldest first)
 * - Extension (group by type)
 * - Custom (user-defined logic)
 */

/**
 * Real-World Applications:
 *
 * - Download folder organizer
 * - Media library management
 * - Project file organization
 * - Automated file archival
 * - Disk space analysis
 * - Duplicate file detection
 */
