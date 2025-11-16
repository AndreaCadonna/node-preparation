/**
 * Example 6: Advanced Path Integration
 *
 * Demonstrates effective combination of fs and path modules.
 *
 * Key Concepts:
 * - Building dynamic file paths
 * - Cross-platform path handling
 * - Path validation and sanitization
 * - Directory tree navigation
 */

const fs = require('fs').promises;
const path = require('path');

async function demonstratePathIntegration() {
  console.log('Path and FileSystem Integration\n');
  console.log('═'.repeat(50));

  try {
    // Example 1: Building safe file paths
    console.log('\n1. Building Safe File Paths');
    console.log('─'.repeat(50));

    // ✓ GOOD: Use path.join()
    const goodPath = path.join(__dirname, 'data', 'users', 'profile.json');
    console.log('Safe path:', goodPath);

    // ✗ BAD: String concatenation
    const badPath = __dirname + '/data/users/profile.json';
    console.log('Unsafe path:', badPath, '(works on Unix, breaks on Windows)');

    // Example 2: Path normalization
    console.log('\n2. Path Normalization');
    console.log('─'.repeat(50));

    const messyPaths = [
      './data/../data/./file.txt',
      'data//subdir///file.txt',
      'data/subdir/../../data/file.txt'
    ];

    messyPaths.forEach(p => {
      console.log(`  ${p}`);
      console.log(`  → ${path.normalize(p)}`);
    });

    // Example 3: Relative vs Absolute paths
    console.log('\n3. Relative vs Absolute Paths');
    console.log('─'.repeat(50));

    const relativePath = 'data/file.txt';
    const absolutePath = path.resolve(relativePath);

    console.log(`Relative: ${relativePath}`);
    console.log(`Absolute: ${absolutePath}`);
    console.log(`Is absolute: ${path.isAbsolute(absolutePath)}`);

    // Example 4: Path parsing and manipulation
    console.log('\n4. Path Parsing');
    console.log('─'.repeat(50));

    const filePath = '/home/user/documents/report.pdf';
    const parsed = path.parse(filePath);

    console.log('Parsed path:');
    console.log(`  Root: ${parsed.root}`);
    console.log(`  Directory: ${parsed.dir}`);
    console.log(`  Base: ${parsed.base}`);
    console.log(`  Name: ${parsed.name}`);
    console.log(`  Extension: ${parsed.ext}`);

    // Reconstruct path
    const rebuilt = path.format(parsed);
    console.log(`  Rebuilt: ${rebuilt}`);

    // Example 5: Finding files by traversing up
    console.log('\n5. Finding Files in Parent Directories');
    console.log('─'.repeat(50));

    async function findFileUp(filename, startDir = __dirname) {
      let currentDir = startDir;
      const root = path.parse(currentDir).root;

      while (currentDir !== root) {
        const testPath = path.join(currentDir, filename);

        try {
          await fs.access(testPath);
          return testPath; // Found!
        } catch {
          // Not found, go up one level
          currentDir = path.dirname(currentDir);
        }
      }

      return null; // Not found
    }

    // Try to find package.json (common in Node projects)
    const packageJson = await findFileUp('package.json');
    if (packageJson) {
      console.log(`Found package.json at: ${packageJson}`);
    } else {
      console.log('package.json not found');
    }

    // Example 6: Working with file extensions
    console.log('\n6. File Extension Operations');
    console.log('─'.repeat(50));

    const files = [
      'document.pdf',
      'image.jpg',
      'archive.tar.gz',
      'noextension',
      '.hidden'
    ];

    files.forEach(file => {
      const ext = path.extname(file);
      const name = path.basename(file, ext);

      console.log(`  File: ${file}`);
      console.log(`    Name: ${name}, Ext: ${ext || '(none)'}`);
    });

    // Example 7: Creating organized directory structures
    console.log('\n7. Organized Directory Creation');
    console.log('─'.repeat(50));

    const baseDir = path.join(__dirname, 'organized-files');

    async function organizeByExtension(files, targetDir) {
      for (const file of files) {
        const ext = path.extname(file).slice(1) || 'no-extension';
        const dir = path.join(targetDir, ext);

        await fs.mkdir(dir, { recursive: true });

        const sourcePath = path.join(targetDir, file);
        const destPath = path.join(dir, path.basename(file));

        console.log(`  ${file} → ${ext}/`);
      }
    }

    const testFiles = ['doc.pdf', 'image.jpg', 'data.json', 'readme'];
    await fs.mkdir(baseDir, { recursive: true });

    // Create test files
    for (const file of testFiles) {
      await fs.writeFile(path.join(baseDir, file), 'content');
    }

    await organizeByExtension(testFiles, baseDir);

    // Example 8: Path sanitization for security
    console.log('\n8. Path Sanitization');
    console.log('─'.repeat(50));

    function sanitizePath(userPath, baseDir) {
      // Resolve to absolute path
      const resolved = path.resolve(baseDir, userPath);

      // Ensure it's within baseDir (prevent path traversal)
      if (!resolved.startsWith(baseDir)) {
        throw new Error('Path traversal detected!');
      }

      return resolved;
    }

    const safeBaseDir = path.join(__dirname, 'safe-zone');
    await fs.mkdir(safeBaseDir, { recursive: true });

    const testPaths = [
      'file.txt',                    // ✓ Safe
      'subdir/file.txt',            // ✓ Safe
      '../../../etc/passwd',        // ✗ Dangerous
      './../outside.txt'            // ✗ Dangerous
    ];

    testPaths.forEach(testPath => {
      try {
        const safe = sanitizePath(testPath, safeBaseDir);
        console.log(`  ✓ ${testPath} → ${path.relative(safeBaseDir, safe)}`);
      } catch (err) {
        console.log(`  ✗ ${testPath} → ${err.message}`);
      }
    });

    // Example 9: Calculating relative paths
    console.log('\n9. Relative Path Calculation');
    console.log('─'.repeat(50));

    const from = '/home/user/projects/app/src';
    const to = '/home/user/projects/app/public/images';

    const relative = path.relative(from, to);
    console.log(`From: ${from}`);
    console.log(`To: ${to}`);
    console.log(`Relative: ${relative}`);

    // Example 10: Cross-platform path handling
    console.log('\n10. Cross-Platform Paths');
    console.log('─'.repeat(50));

    console.log('Current platform:', process.platform);
    console.log('Path separator:', path.sep);
    console.log('Delimiter:', path.delimiter);

    // Converting between formats
    const unixPath = 'home/user/file.txt';
    const windowsPath = 'C:\\Users\\user\\file.txt';

    console.log(`\nUnix-style: ${unixPath}`);
    console.log(`Normalized: ${path.normalize(unixPath)}`);

    console.log(`\nWindows-style: ${windowsPath}`);
    console.log(`Normalized: ${path.normalize(windowsPath)}`);

    // Cleanup
    console.log('\n11. Cleanup');
    console.log('─'.repeat(50));

    await fs.rm(baseDir, { recursive: true, force: true });
    await fs.rm(safeBaseDir, { recursive: true, force: true });
    console.log('✓ Cleanup complete');

  } catch (err) {
    console.error('Error:', err.message);
  }
}

demonstratePathIntegration();

/**
 * Essential Path Methods:
 *
 * path.join(...paths)
 * - Joins path segments
 * - Normalizes result
 * - Uses correct separator for OS
 *
 * path.resolve(...paths)
 * - Resolves to absolute path
 * - Like cd command
 * - Returns absolute path
 *
 * path.relative(from, to)
 * - Calculate relative path
 * - Useful for creating links
 *
 * path.normalize(path)
 * - Resolves . and ..
 * - Removes duplicate separators
 * - Doesn't access filesystem
 *
 * path.parse(path) / path.format(obj)
 * - Deconstruct/reconstruct paths
 * - Access individual components
 *
 * path.basename(path, [ext])
 * - Get filename
 * - Optionally remove extension
 *
 * path.dirname(path)
 * - Get directory name
 *
 * path.extname(path)
 * - Get file extension
 *
 * path.isAbsolute(path)
 * - Check if path is absolute
 */

/**
 * Security Best Practices:
 *
 * ✓ Always use path.join() or path.resolve()
 * ✓ Validate user-provided paths
 * ✓ Check resolved paths stay within allowed directories
 * ✓ Sanitize filenames
 * ✓ Never trust user input directly
 *
 * ✗ Don't concatenate paths with strings
 * ✗ Don't use user input without validation
 * ✗ Don't allow .. in user paths without checking
 */

/**
 * Common Patterns:
 *
 * 1. Find project root:
 *    while (!exists('package.json')) {
 *      dir = path.dirname(dir);
 *    }
 *
 * 2. Safe path joining:
 *    const safe = path.join(BASE, path.normalize(userPath));
 *    if (!safe.startsWith(BASE)) throw new Error('Invalid');
 *
 * 3. Change extension:
 *    const newPath = path.format({
 *      ...path.parse(oldPath),
 *      base: undefined,
 *      ext: '.new'
 *    });
 */
