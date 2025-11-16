/**
 * Exercise 1: Create Directory Tree from JSON Schema
 *
 * DIFFICULTY: ⭐⭐ Medium
 * TIME: 25-30 minutes
 *
 * OBJECTIVE:
 * Create a program that reads a JSON schema and creates a matching directory structure.
 *
 * REQUIREMENTS:
 * 1. Read a JSON schema file that describes a directory structure
 * 2. Create all directories specified in the schema
 * 3. Create placeholder files where specified
 * 4. Handle nested structures recursively
 * 5. Display a tree view of what was created
 * 6. Handle errors gracefully (permissions, disk space, etc.)
 *
 * SCHEMA FORMAT:
 * {
 *   "directories": {
 *     "src": {
 *       "directories": {
 *         "components": {},
 *         "utils": {}
 *       },
 *       "files": ["index.js", "app.js"]
 *     },
 *     "tests": {
 *       "files": ["test.js"]
 *     }
 *   },
 *   "files": ["README.md", "package.json"]
 * }
 *
 * BONUS CHALLENGES:
 * - Support file content in the schema
 * - Validate the schema before creating structure
 * - Add option to dry-run (show what would be created)
 * - Support templates for file content
 * - Add progress indicator for large structures
 *
 * HINTS:
 * - Use recursive functions to handle nested structures
 * - Use path.join() to build file paths
 * - Use mkdir with { recursive: true }
 * - Keep track of created items for the tree view
 */

const fs = require('fs').promises;
const path = require('path');

// Example schema for testing
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

// TODO: Implement your solution here

async function createDirectoryTree(schema, basePath = '.') {
  // Your code here
  // 1. Parse the schema
  // 2. Create directories recursively
  // 3. Create files
  // 4. Build and display tree view
  // 5. Handle errors
}

async function displayTree(rootPath, prefix = '', isLast = true) {
  // Your code here
  // Display the created structure as a tree
}

// Don't forget to test your function!
// createDirectoryTree(exampleSchema, path.join(__dirname, 'output'));

/**
 * TESTING YOUR SOLUTION:
 *
 * 1. Save the example schema to a file:
 *    const schemaPath = './project-structure.json';
 *    await fs.writeFile(schemaPath, JSON.stringify(exampleSchema, null, 2));
 *
 * 2. Run your solution:
 *    node exercise-1.js
 *
 * 3. Expected output:
 *    Creating directory structure...
 *    ✓ Created: my-project/
 *    ✓ Created: my-project/src/
 *    ✓ Created: my-project/src/components/
 *    ...
 *    ✓ Created: my-project/package.json
 *
 *    Tree view:
 *    my-project/
 *    ├── src/
 *    │   ├── components/
 *    │   ├── utils/
 *    │   ├── services/
 *    │   ├── index.js
 *    │   ├── app.js
 *    │   └── config.js
 *    ├── tests/
 *    │   ├── app.test.js
 *    │   └── utils.test.js
 *    ├── docs/
 *    │   ├── README.md
 *    │   └── API.md
 *    ├── package.json
 *    ├── .gitignore
 *    └── README.md
 *
 * 4. Verify:
 *    Check that all directories and files were created
 *    ls -R my-project
 */

/**
 * EXAMPLE USAGE:
 *
 * // From JSON file
 * const schema = JSON.parse(await fs.readFile('schema.json', 'utf8'));
 * await createDirectoryTree(schema, './output');
 *
 * // With dry-run
 * await createDirectoryTree(schema, './output', { dryRun: true });
 *
 * // With custom file content
 * const schemaWithContent = {
 *   directories: {
 *     'src': {
 *       files: [{
 *         name: 'index.js',
 *         content: 'console.log("Hello World");'
 *       }]
 *     }
 *   }
 * };
 */

/**
 * ERROR HANDLING:
 *
 * Handle these scenarios:
 * - Invalid schema format
 * - Permission denied
 * - Disk full
 * - Path too long
 * - Directory already exists
 */

/**
 * LEARNING NOTES:
 *
 * Write down what you learned:
 * - How do you handle nested structures recursively?
 * - What's the best way to visualize a directory tree?
 * - How do you handle errors in recursive functions?
 * - What's the difference between creating files and directories?
 */
