/**
 * Exercise 2 Solution: Write User Input to a File
 *
 * This solution demonstrates:
 * - Using readline for user input
 * - Converting callbacks to promises
 * - Writing formatted data to a file
 * - Verifying file contents after writing
 */

const fs = require('fs').promises;
const readline = require('readline');
const path = require('path');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to promisify readline.question
function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function writeUserProfile() {
  try {
    console.log('═'.repeat(50));
    console.log('User Profile Creator');
    console.log('═'.repeat(50));
    console.log();

    // 1. Prompt for user information
    const name = await question('What is your name? ');
    const language = await question('What is your favorite programming language? ');

    // 2. Create formatted message
    const timestamp = new Date().toISOString();
    const message = `Name: ${name}
Favorite Language: ${language}
Created: ${timestamp}`;

    // 3. Define file path
    const filePath = path.join(__dirname, '..', 'exercises', 'profile.txt');

    // 4. Write to file
    await fs.writeFile(filePath, message);
    console.log('\n✓ Profile saved to profile.txt');

    // 5. Read and display the file to verify
    const content = await fs.readFile(filePath, 'utf8');
    console.log('\nFile contents:');
    console.log('─'.repeat(50));
    console.log(content);
    console.log('─'.repeat(50));

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    // 6. Always close the readline interface
    rl.close();
  }
}

// Run the function
writeUserProfile();

/**
 * ALTERNATIVE SOLUTION: JSON Format
 */

async function writeUserProfileJSON() {
  try {
    const name = await question('Name: ');
    const language = await question('Language: ');
    const age = await question('Age: ');
    const city = await question('City: ');

    // Create profile object
    const profile = {
      name,
      language,
      age: parseInt(age),
      city,
      timestamp: new Date().toISOString()
    };

    // Write as formatted JSON
    const filePath = path.join(__dirname, '..', 'exercises', 'profile.json');
    await fs.writeFile(filePath, JSON.stringify(profile, null, 2));

    console.log('\n✓ Profile saved to profile.json');

    // Display the JSON
    const content = await fs.readFile(filePath, 'utf8');
    console.log('\n' + content);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    rl.close();
  }
}

/**
 * BONUS SOLUTION: Overwrite Protection
 */

async function writeUserProfileWithProtection() {
  try {
    const filePath = path.join(__dirname, '..', 'exercises', 'profile.txt');

    // Check if file exists
    try {
      await fs.access(filePath);
      const overwrite = await question('\n⚠ File already exists. Overwrite? (y/n): ');

      if (overwrite.toLowerCase() !== 'y') {
        console.log('Operation cancelled.');
        rl.close();
        return;
      }
    } catch {
      // File doesn't exist, that's fine
    }

    const name = await question('Name: ');
    const language = await question('Language: ');

    const message = `Name: ${name}\nLanguage: ${language}\n`;
    await fs.writeFile(filePath, message);

    console.log('\n✓ Profile saved successfully!');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    rl.close();
  }
}

/**
 * BONUS SOLUTION: Append Mode (Multiple Profiles)
 */

async function appendUserProfile() {
  try {
    const filePath = path.join(__dirname, '..', 'exercises', 'profiles.txt');

    const name = await question('Name: ');
    const language = await question('Language: ');

    const timestamp = new Date().toLocaleString();
    const entry = `\n${'─'.repeat(30)}\nName: ${name}\nLanguage: ${language}\nAdded: ${timestamp}\n`;

    // Append to file (creates if doesn't exist)
    await fs.appendFile(filePath, entry);

    console.log('\n✓ Profile added to profiles.txt');

    // Count total profiles
    const content = await fs.readFile(filePath, 'utf8');
    const profileCount = (content.match(/^Name:/gm) || []).length;
    console.log(`Total profiles: ${profileCount}`);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    rl.close();
  }
}

/**
 * KEY LEARNING POINTS:
 *
 * 1. Readline Module:
 *    - createInterface() sets up input/output
 *    - question() uses callbacks (need to promisify)
 *    - Always close the interface when done
 *
 * 2. Promisifying Callbacks:
 *    function question(query) {
 *      return new Promise(resolve => rl.question(query, resolve));
 *    }
 *
 * 3. Template Literals:
 *    - Use backticks for multi-line strings
 *    - ${variable} for interpolation
 *    - Preserves formatting and newlines
 *
 * 4. JSON Formatting:
 *    JSON.stringify(obj, null, 2)
 *    - null: no replacer function
 *    - 2: indentation spaces
 *
 * 5. File Operations:
 *    - writeFile() for new file or overwrite
 *    - appendFile() to add to existing file
 *    - access() to check if file exists
 */

/**
 * COMMON MISTAKES TO AVOID:
 *
 * ❌ Not closing readline:
 *    // Program hangs if you don't close rl
 *
 * ❌ Not using finally:
 *    try { ... } catch { ... }
 *    rl.close(); // Won't run if error thrown
 *
 * ✅ Use finally:
 *    try { ... } catch { ... } finally { rl.close(); }
 *
 * ❌ Forgetting to await:
 *    const answer = question('Name: '); // Returns Promise!
 *
 * ✅ Always await:
 *    const answer = await question('Name: ');
 *
 * ❌ Not validating input:
 *    // User might press enter without typing
 *
 * ✅ Validate:
 *    if (!name.trim()) {
 *      console.error('Name cannot be empty');
 *      return;
 *    }
 */

/**
 * ENHANCEMENTS:
 *
 * 1. Input Validation:
 *    if (!name) throw new Error('Name is required');
 *
 * 2. Default Values:
 *    const lang = language || 'JavaScript';
 *
 * 3. Multiple Retries:
 *    let name = '';
 *    while (!name.trim()) {
 *      name = await question('Name (required): ');
 *    }
 *
 * 4. Menu System:
 *    const action = await question('1) Create  2) View  3) Delete: ');
 *
 * 5. File Format Options:
 *    const format = await question('Format (txt/json): ');
 */
