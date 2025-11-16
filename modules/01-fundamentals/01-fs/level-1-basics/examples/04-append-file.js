/**
 * Example 4: Appending to Files
 *
 * This example demonstrates how to add content to existing files
 * without overwriting them.
 *
 * Key Concepts:
 * - appendFile() method
 * - Difference between write and append
 * - Common use cases (logging, data collection)
 * - Creating files if they don't exist
 */

const fs = require('fs').promises;
const path = require('path');

async function demonstrateAppending() {
  try {
    console.log('File Appending Examples\n');
    console.log('═'.repeat(50));

    const logFile = path.join(__dirname, 'app.log');

    // Example 1: Create initial file
    console.log('\n1. Creating Initial Log File');
    console.log('─'.repeat(50));

    await fs.writeFile(logFile, 'Application Log\n');
    await fs.appendFile(logFile, '═'.repeat(30) + '\n');
    console.log('✓ Created app.log');

    // Example 2: Append single line
    console.log('\n2. Appending Single Line');
    console.log('─'.repeat(50));

    const timestamp = new Date().toISOString();
    await fs.appendFile(logFile, `[${timestamp}] Application started\n`);
    console.log('✓ Appended log entry');

    // Example 3: Append multiple lines
    console.log('\n3. Appending Multiple Entries');
    console.log('─'.repeat(50));

    const entries = [
      'User logged in: admin',
      'Database connected',
      'Server listening on port 3000'
    ];

    for (const entry of entries) {
      const time = new Date().toISOString();
      await fs.appendFile(logFile, `[${time}] ${entry}\n`);
    }
    console.log(`✓ Appended ${entries.length} log entries`);

    // Display current log content
    const logContent = await fs.readFile(logFile, 'utf8');
    console.log('\nCurrent log content:');
    console.log('─'.repeat(50));
    console.log(logContent);
    console.log('─'.repeat(50));

    // Example 4: Append vs Write comparison
    console.log('\n4. Append vs Write Comparison');
    console.log('─'.repeat(50));

    const testFile = path.join(__dirname, 'test.txt');

    // Using write (overwrites)
    await fs.writeFile(testFile, 'First write\n');
    await fs.writeFile(testFile, 'Second write\n');
    const writeResult = await fs.readFile(testFile, 'utf8');
    console.log('After two writes:');
    console.log(`  "${writeResult.trim()}"`); // Only "Second write"

    // Using append (adds to end)
    await fs.writeFile(testFile, 'Initial content\n');
    await fs.appendFile(testFile, 'First append\n');
    await fs.appendFile(testFile, 'Second append\n');
    const appendResult = await fs.readFile(testFile, 'utf8');
    console.log('\nAfter write + two appends:');
    console.log('  ' + appendResult.split('\n').filter(Boolean).join('\n  '));

    // Example 5: Appending to non-existent file
    console.log('\n5. Appending to Non-Existent File');
    console.log('─'.repeat(50));

    const newFile = path.join(__dirname, 'new-file.txt');

    // appendFile creates the file if it doesn't exist
    await fs.appendFile(newFile, 'This file was created by appendFile\n');
    console.log('✓ File created and content appended');

    // Example 6: Building a CSV file
    console.log('\n6. Building a CSV File');
    console.log('─'.repeat(50));

    const csvFile = path.join(__dirname, 'data.csv');

    // Write header
    await fs.writeFile(csvFile, 'Name,Age,City\n');

    // Append data rows
    const users = [
      { name: 'Alice', age: 25, city: 'New York' },
      { name: 'Bob', age: 30, city: 'London' },
      { name: 'Charlie', age: 35, city: 'Tokyo' }
    ];

    for (const user of users) {
      const row = `${user.name},${user.age},${user.city}\n`;
      await fs.appendFile(csvFile, row);
    }

    console.log('✓ Created CSV file with header and data');

    const csvContent = await fs.readFile(csvFile, 'utf8');
    console.log('\nCSV Content:');
    console.log(csvContent);

    // Example 7: Log rotation simulation
    console.log('7. Log Rotation Simulation');
    console.log('─'.repeat(50));

    const rotatingLog = path.join(__dirname, 'rotating.log');
    const maxSize = 200; // bytes

    // Helper function to append with rotation
    async function appendWithRotation(file, content) {
      try {
        const stats = await fs.stat(file);
        if (stats.size >= maxSize) {
          // Rotate the log
          await fs.rename(file, file + '.old');
          console.log('  ⟲ Log rotated');
        }
      } catch (err) {
        // File doesn't exist, that's okay
      }

      await fs.appendFile(file, content);
    }

    // Append entries until rotation happens
    for (let i = 1; i <= 10; i++) {
      await appendWithRotation(rotatingLog, `Entry ${i}: This is a log message\n`);
    }
    console.log('✓ Demonstrated log rotation');

    // Cleanup
    console.log('\n8. Cleanup');
    console.log('─'.repeat(50));

    const filesToDelete = [
      logFile, testFile, newFile, csvFile,
      rotatingLog, rotatingLog + '.old'
    ];

    for (const file of filesToDelete) {
      try {
        await fs.unlink(file);
      } catch {
        // File might not exist, that's okay
      }
    }
    console.log('✓ Cleaned up all example files');

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
  }
}

// Run the demonstration
demonstrateAppending();

/**
 * Key Differences: writeFile() vs appendFile()
 *
 * writeFile():
 * - Overwrites existing content
 * - Creates file if doesn't exist
 * - Use for: configuration files, complete data replacement
 *
 * appendFile():
 * - Adds to end of existing content
 * - Creates file if doesn't exist
 * - Use for: logs, incremental data, journals
 */

/**
 * Common Use Cases for appendFile():
 *
 * 1. Logging:
 *    await fs.appendFile('app.log', `[${timestamp}] ${message}\n`);
 *
 * 2. Data Collection:
 *    await fs.appendFile('data.csv', `${row}\n`);
 *
 * 3. Journaling:
 *    await fs.appendFile('journal.txt', `${date}: ${entry}\n`);
 *
 * 4. Audit Trails:
 *    await fs.appendFile('audit.log', `${user} performed ${action}\n`);
 *
 * 5. Building Reports:
 *    await fs.appendFile('report.txt', `Section: ${content}\n`);
 */

/**
 * Best Practices:
 *
 * ✓ Add newlines (\n) for each entry
 * ✓ Include timestamps for logs
 * ✓ Consider log rotation for long-running apps
 * ✓ Use structured formats (JSON, CSV) when possible
 * ✓ Handle errors (disk full, permissions)
 *
 * ✗ Don't append huge amounts at once (use streams)
 * ✗ Don't append binary data without planning
 * ✗ Don't forget newlines (hard to read)
 */

/**
 * Performance Note:
 *
 * For high-frequency logging, consider:
 * - Batching writes
 * - Using streams (writeStream.write())
 * - Using a logging library (winston, pino)
 * - Writing to memory buffer, then flushing periodically
 */

/**
 * Try This:
 *
 * 1. Run this file: node 04-append-file.js
 * 2. Create a diary application that appends entries
 * 3. Build a simple logger function
 * 4. Create a CSV file of your favorite movies
 * 5. Implement a simple visitor counter
 */

/**
 * Challenge:
 *
 * Build a simple logging utility:
 * - logInfo(message)
 * - logWarning(message)
 * - logError(message)
 * - Each with timestamps and log levels
 * - Automatically rotate when file > 1KB
 */
