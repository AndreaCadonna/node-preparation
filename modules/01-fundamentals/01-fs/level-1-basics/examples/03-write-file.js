/**
 * Example 3: Writing Files
 *
 * This example demonstrates different ways to write data to files.
 *
 * Key Concepts:
 * - writeFile() - creates or overwrites
 * - File encoding options
 * - Writing different data types
 * - File creation flags
 */

const fs = require('fs').promises;
const path = require('path');

async function demonstrateWriting() {
  try {
    console.log('File Writing Examples\n');
    console.log('═'.repeat(50));

    // Example 1: Simple text write
    console.log('\n1. Simple Text Write');
    console.log('─'.repeat(50));

    const textFile = path.join(__dirname, 'output.txt');
    await fs.writeFile(textFile, 'Hello, Node.js!');
    console.log('✓ Created output.txt');

    const content = await fs.readFile(textFile, 'utf8');
    console.log(`  Content: "${content}"`);

    // Example 2: Overwriting existing file
    console.log('\n2. Overwriting File');
    console.log('─'.repeat(50));

    await fs.writeFile(textFile, 'New content - old content is gone!');
    console.log('✓ Overwritten output.txt');

    const newContent = await fs.readFile(textFile, 'utf8');
    console.log(`  Content: "${newContent}"`);

    // Example 3: Writing multi-line content
    console.log('\n3. Multi-line Content');
    console.log('─'.repeat(50));

    const multiLineFile = path.join(__dirname, 'multiline.txt');
    const multiLineContent = `Line 1: Introduction
Line 2: Body
Line 3: Conclusion`;

    await fs.writeFile(multiLineFile, multiLineContent);
    console.log('✓ Created multiline.txt');
    console.log('  Content:');
    console.log('  ' + multiLineContent.split('\n').join('\n  '));

    // Example 4: Writing objects as JSON
    console.log('\n4. Writing JSON Data');
    console.log('─'.repeat(50));

    const jsonFile = path.join(__dirname, 'data.json');
    const dataObject = {
      name: 'John Doe',
      age: 30,
      skills: ['JavaScript', 'Node.js', 'React'],
      active: true
    };

    // Convert object to JSON string with formatting
    const jsonString = JSON.stringify(dataObject, null, 2);
    await fs.writeFile(jsonFile, jsonString);
    console.log('✓ Created data.json');
    console.log('  Content:', jsonString);

    // Example 5: Writing with explicit encoding
    console.log('\n5. Explicit Encoding');
    console.log('─'.repeat(50));

    const encodedFile = path.join(__dirname, 'encoded.txt');
    await fs.writeFile(encodedFile, 'UTF-8 encoded text', { encoding: 'utf8' });
    console.log('✓ Created encoded.txt with UTF-8 encoding');

    // Example 6: Writing binary data (Buffer)
    console.log('\n6. Binary Data (Buffer)');
    console.log('─'.repeat(50));

    const binaryFile = path.join(__dirname, 'binary.dat');
    const buffer = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello" in hex
    await fs.writeFile(binaryFile, buffer);
    console.log('✓ Created binary.dat');

    const readBuffer = await fs.readFile(binaryFile);
    console.log(`  Hex: ${readBuffer.toString('hex')}`);
    console.log(`  Text: ${readBuffer.toString('utf8')}`);

    // Example 7: Conditional write (check if exists first)
    console.log('\n7. Conditional Write (Safe)');
    console.log('─'.repeat(50));

    const safeFile = path.join(__dirname, 'safe.txt');

    try {
      await fs.access(safeFile);
      console.log('⚠ File exists, not overwriting');
    } catch {
      await fs.writeFile(safeFile, 'This is a new file');
      console.log('✓ Created safe.txt (did not exist)');
    }

    // Cleanup examples
    console.log('\n8. Cleanup');
    console.log('─'.repeat(50));

    const filesToDelete = [
      textFile, multiLineFile, jsonFile,
      encodedFile, binaryFile, safeFile
    ];

    for (const file of filesToDelete) {
      await fs.unlink(file);
    }
    console.log('✓ Cleaned up all example files');

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

// Run the demonstration
demonstrateWriting();

/**
 * Important Notes:
 *
 * 1. writeFile() Behavior:
 *    - Creates file if it doesn't exist
 *    - OVERWRITES file if it exists
 *    - Creates parent directory? NO! (will error)
 *    - Returns a Promise (when using fs.promises)
 *
 * 2. Common Options:
 *    {
 *      encoding: 'utf8',    // default for strings
 *      mode: 0o666,         // file permissions
 *      flag: 'w'            // 'w' = write (default)
 *    }
 *
 * 3. File Flags:
 *    - 'w'  : write (overwrite)
 *    - 'wx' : write (fail if exists)
 *    - 'a'  : append
 *    - 'ax' : append (fail if exists)
 *
 * 4. Data Types You Can Write:
 *    - String
 *    - Buffer
 *    - TypedArray
 *    - DataView
 *
 * 5. Best Practices:
 *    ✓ Always handle errors
 *    ✓ Use path.join() for file paths
 *    ✓ Validate data before writing
 *    ✓ Consider using appendFile() instead of overwriting
 *    ✗ Don't write sensitive data without encryption
 */

/**
 * Common Mistakes:
 *
 * ❌ Not checking if directory exists:
 *    await fs.writeFile('/nonexistent/file.txt', 'data');
 *    // Error: ENOENT
 *
 * ❌ Forgetting to stringify objects:
 *    await fs.writeFile('data.json', { key: 'value' });
 *    // Writes: [object Object]
 *
 * ❌ Not handling errors:
 *    await fs.writeFile('file.txt', 'data'); // Will crash if error
 *
 * ✅ Correct:
 *    try {
 *      await fs.writeFile('file.txt', 'data');
 *    } catch (err) {
 *      console.error('Write failed:', err.message);
 *    }
 */

/**
 * Try This:
 *
 * 1. Run this file: node 03-write-file.js
 * 2. Create a file with your name and favorite food
 * 3. Write an array of numbers to a JSON file
 * 4. Try writing to a non-existent directory (see the error)
 * 5. Write a file with the current date and time
 */

/**
 * Challenge:
 *
 * Create a function that:
 * - Accepts filename and data
 * - Checks if file exists
 * - If exists, asks for confirmation (use readline)
 * - Writes the file
 * - Returns success/failure message
 */
