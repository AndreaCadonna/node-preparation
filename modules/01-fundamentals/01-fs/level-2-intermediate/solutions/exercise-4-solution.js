/**
 * Exercise 4 Solution: File Organizer by Type
 *
 * Organizes files into categorized folders with dry-run support.
 */

const fs = require('fs').promises;
const path = require('path');

const FILE_CATEGORIES = {
  documents: ['.pdf', '.doc', '.docx', '.txt', '.md', '.rtf', '.odt'],
  images: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.ico', '.webp'],
  videos: ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm'],
  audio: ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma'],
  archives: ['.zip', '.rar', '.tar', '.gz', '.7z', '.bz2'],
  code: ['.js', '.py', '.java', '.cpp', '.c', '.h', '.html', '.css', '.json', '.xml'],
  others: [] // Catch-all
};

async function organizeFiles(sourceDir, options = {}) {
  const { dryRun = false, move = true } = options;
  const stats = {
    processed: 0,
    categoriesCreated: 0,
    errors: 0,
    byCategory: {}
  };

  console.log(`${dryRun ? 'DRY RUN: ' : ''}Organizing files in: ${sourceDir}\n`);

  try {
    // Read all files in directory
    const files = await fs.readdir(sourceDir);
    const fileDetails = [];

    for (const file of files) {
      const filePath = path.join(sourceDir, file);
      const stat = await fs.stat(filePath);

      if (stat.isFile()) {
        const category = categorizeFile(file);
        fileDetails.push({ name: file, path: filePath, category });
      }
    }

    // Group by category
    const grouped = {};
    for (const file of fileDetails) {
      if (!grouped[file.category]) {
        grouped[file.category] = [];
      }
      grouped[file.category].push(file);
    }

    // Create categories and move files
    for (const [category, files] of Object.entries(grouped)) {
      const categoryDir = path.join(sourceDir, category);

      // Create category directory
      if (!dryRun) {
        await fs.mkdir(categoryDir, { recursive: true });
      }

      console.log(`${dryRun ? 'Would create' : 'Created'}: ${category}/`);
      stats.categoriesCreated++;
      stats.byCategory[category] = files.length;

      // Move files
      for (const file of files) {
        const destPath = path.join(categoryDir, file.name);

        // Handle duplicates
        const finalDest = await getUniqueFilename(categoryDir, file.name, dryRun);

        try {
          if (!dryRun) {
            if (move) {
              await fs.rename(file.path, path.join(categoryDir, finalDest));
            } else {
              await fs.copyFile(file.path, path.join(categoryDir, finalDest));
            }
          }

          console.log(`  ${file.name} → ${category}/${finalDest}`);
          stats.processed++;
        } catch (err) {
          console.error(`  ✗ Failed: ${file.name} (${err.message})`);
          stats.errors++;
        }
      }

      console.log();
    }

    // Display summary
    displaySummary(stats, dryRun);

    return stats;

  } catch (err) {
    console.error('Error:', err.message);
    throw err;
  }
}

function categorizeFile(filename) {
  const ext = path.extname(filename).toLowerCase();

  for (const [category, extensions] of Object.entries(FILE_CATEGORIES)) {
    if (extensions.includes(ext)) {
      return category;
    }
  }

  return 'others';
}

async function getUniqueFilename(dir, filename, dryRun = false) {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  let counter = 1;
  let newName = filename;

  while (!dryRun && await fileExists(path.join(dir, newName))) {
    newName = `${base}_${counter}${ext}`;
    counter++;
  }

  return newName;
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function displaySummary(stats, dryRun) {
  console.log('═'.repeat(50));
  console.log(dryRun ? 'DRY RUN Summary' : 'Summary');
  console.log('═'.repeat(50));

  console.log(`Files ${dryRun ? 'to organize' : 'organized'}: ${stats.processed}`);
  console.log(`Categories ${dryRun ? 'to create' : 'created'}: ${stats.categoriesCreated}`);

  if (stats.errors > 0) {
    console.log(`Errors: ${stats.errors}`);
  }

  console.log('\nBreakdown by category:');
  for (const [category, count] of Object.entries(stats.byCategory)) {
    console.log(`  ${category.padEnd(15)} ${count} file${count !== 1 ? 's' : ''}`);
  }

  console.log('═'.repeat(50));
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node exercise-4-solution.js <directory> [options]');
    console.log('\nOptions:');
    console.log('  --dry-run    Show what would be done without making changes');
    console.log('  --copy       Copy files instead of moving them');
    console.log('\nExamples:');
    console.log('  node exercise-4-solution.js ./downloads');
    console.log('  node exercise-4-solution.js ./downloads --dry-run');
    console.log('  node exercise-4-solution.js ./downloads --copy');
    process.exit(0);
  }

  const sourceDir = path.resolve(args[0]);
  const options = {
    dryRun: args.includes('--dry-run'),
    move: !args.includes('--copy')
  };

  try {
    // Verify directory exists
    await fs.access(sourceDir);

    await organizeFiles(sourceDir, options);

  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error(`Error: Directory not found: ${sourceDir}`);
    } else {
      console.error('Error:', err.message);
    }
    process.exit(1);
  }
}

main();

/**
 * UNDO FUNCTIONALITY (Bonus)
 */

async function createUndoScript(sourceDir, stats) {
  const undoCommands = [];

  for (const [category, files] of Object.entries(stats.byCategory)) {
    for (const file of files) {
      undoCommands.push(`mv "${category}/${file}" .`);
    }
    undoCommands.push(`rmdir "${category}"`);
  }

  const scriptPath = path.join(sourceDir, 'undo-organize.sh');
  await fs.writeFile(scriptPath, undoCommands.join('\n'));
  await fs.chmod(scriptPath, '755');

  console.log(`\nUndo script created: ${scriptPath}`);
  console.log('Run it to restore original structure');
}

/**
 * KEY POINTS:
 *
 * 1. Categorization:
 *    - Extension-based categorization
 *    - Configurable categories
 *    - Catch-all for uncategorized files
 *
 * 2. Safety:
 *    - Dry-run mode
 *    - Duplicate filename handling
 *    - Error handling per file
 *
 * 3. Flexibility:
 *    - Move or copy option
 *    - Custom categories
 *    - Undo functionality
 */
