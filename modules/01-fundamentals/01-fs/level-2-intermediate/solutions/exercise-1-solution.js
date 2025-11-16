/**
 * Exercise 1 Solution: Create Directory Tree from JSON Schema
 *
 * This solution demonstrates recursive directory creation from a schema.
 */

const fs = require('fs').promises;
const path = require('path');

const exampleSchema = {
  directories: {
    'my-project': {
      directories: {
        'src': {
          directories: {
            'components': {},
            'utils': {},
            'services': {}
          },
          files: ['index.js', 'app.js', 'config.js']
        },
        'tests': {
          files: ['app.test.js', 'utils.test.js']
        },
        'docs': {
          files: ['README.md', 'API.md']
        }
      },
      files: ['package.json', '.gitignore', 'README.md']
    }
  },
  files: []
};

async function createDirectoryTree(schema, basePath = '.') {
  const stats = {
    directoriesCreated: 0,
    filesCreated: 0,
    structure: []
  };

  console.log('Creating directory structure...\n');

  await processSchema(schema, basePath, stats, '');

  console.log('\n✓ Directory structure created!\n');
  console.log('Summary:');
  console.log(`  Directories: ${stats.directoriesCreated}`);
  console.log(`  Files: ${stats.filesCreated}`);

  // Display tree
  console.log('\nTree View:');
  displayTree(stats.structure);

  return stats;
}

async function processSchema(schema, currentPath, stats, indent = '') {
  // Process directories
  if (schema.directories) {
    for (const [dirName, dirSchema] of Object.entries(schema.directories)) {
      const dirPath = path.join(currentPath, dirName);

      try {
        await fs.mkdir(dirPath, { recursive: true });
        console.log(`${indent}✓ Created directory: ${dirName}/`);
        stats.directoriesCreated++;
        stats.structure.push({ type: 'dir', name: dirName, indent });

        // Recursively process subdirectories and files
        await processSchema(dirSchema, dirPath, stats, indent + '  ');
      } catch (err) {
        console.error(`${indent}✗ Failed to create ${dirName}/: ${err.message}`);
      }
    }
  }

  // Process files
  if (schema.files && Array.isArray(schema.files)) {
    for (const fileName of schema.files) {
      const filePath = path.join(currentPath, fileName);

      try {
        // Check if file is an object with content
        if (typeof fileName === 'object' && fileName.name) {
          await fs.writeFile(filePath, fileName.content || '');
          console.log(`${indent}✓ Created file: ${fileName.name} (with content)`);
        } else {
          await fs.writeFile(filePath, '');
          console.log(`${indent}✓ Created file: ${fileName}`);
        }

        stats.filesCreated++;
        stats.structure.push({ type: 'file', name: fileName, indent });
      } catch (err) {
        console.error(`${indent}✗ Failed to create ${fileName}: ${err.message}`);
      }
    }
  }
}

function displayTree(structure, prefix = '') {
  structure.forEach((item, index) => {
    const isLast = index === structure.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const icon = item.type === 'dir' ? '📁' : '📄';

    console.log(`${item.indent}${connector}${icon} ${item.name}`);
  });
}

// Alternative solution with dry-run
async function createDirectoryTreeWithOptions(schema, basePath = '.', options = {}) {
  const { dryRun = false, verbose = true } = options;

  if (dryRun) {
    console.log('DRY RUN MODE - No changes will be made\n');
  }

  const operations = [];

  async function plan(schema, currentPath, indent = '') {
    if (schema.directories) {
      for (const [dirName, dirSchema] of Object.entries(schema.directories)) {
        const dirPath = path.join(currentPath, dirName);
        operations.push({ type: 'mkdir', path: dirPath, name: dirName, indent });

        if (!dryRun) {
          await fs.mkdir(dirPath, { recursive: true });
        }

        if (verbose) {
          console.log(`${indent}${dryRun ? 'Would create' : 'Created'}: ${dirName}/`);
        }

        await plan(dirSchema, dirPath, indent + '  ');
      }
    }

    if (schema.files) {
      for (const fileName of schema.files) {
        const filePath = path.join(currentPath, fileName);
        operations.push({ type: 'touch', path: filePath, name: fileName, indent });

        if (!dryRun) {
          await fs.writeFile(filePath, '');
        }

        if (verbose) {
          console.log(`${indent}${dryRun ? 'Would create' : 'Created'}: ${fileName}`);
        }
      }
    }
  }

  await plan(schema, basePath);

  console.log(`\n${dryRun ? 'Would perform' : 'Performed'} ${operations.length} operations`);

  return operations;
}

// Run the solution
async function main() {
  try {
    const outputDir = path.join(__dirname, '..', 'exercises', 'output');

    // Clean up if exists
    try {
      await fs.rm(outputDir, { recursive: true, force: true });
    } catch {}

    // Create the structure
    await createDirectoryTree(exampleSchema, outputDir);

    // Cleanup after demonstration
    console.log('\nCleaning up...');
    await fs.rm(outputDir, { recursive: true, force: true });
    console.log('✓ Cleanup complete');

  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();

/**
 * KEY LEARNING POINTS:
 *
 * 1. Recursive Processing:
 *    - Function calls itself for nested structures
 *    - Each level handles its own directories and files
 *    - Indent tracking for visualization
 *
 * 2. Schema Design:
 *    - Separate directories and files keys
 *    - Nested objects for subdirectories
 *    - Arrays for file lists
 *
 * 3. Error Handling:
 *    - Try-catch for each operation
 *    - Continue on error (don't fail entire operation)
 *    - Log errors clearly
 *
 * 4. Options Pattern:
 *    - Dry-run mode for safety
 *    - Verbose flag for output control
 *    - Flexible design for extensions
 */
