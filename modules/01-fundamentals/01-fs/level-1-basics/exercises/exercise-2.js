/**
 * Exercise 2: Write User Input to a File
 *
 * DIFFICULTY: ⭐ Easy
 * TIME: 10-15 minutes
 *
 * OBJECTIVE:
 * Create a program that prompts the user for input and writes it to a file.
 *
 * REQUIREMENTS:
 * 1. Prompt the user to enter their name
 * 2. Prompt the user to enter their favorite programming language
 * 3. Create a formatted message with this information
 * 4. Write the message to a file called 'profile.txt'
 * 5. Confirm to the user that the file was created
 * 6. Display the file contents to verify
 *
 * BONUS CHALLENGES:
 * - Prompt for multiple pieces of information
 * - Format the output as JSON
 * - Ask if the user wants to overwrite if file exists
 * - Add a timestamp to the file
 *
 * HINTS:
 * - Use the built-in 'readline' module for user input
 * - Use fs.promises.writeFile() to write the file
 * - Remember to close the readline interface when done
 * - You can use template literals for formatting
 */

const fs = require('fs').promises;
const readline = require('readline');
const path = require('path');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to prompt user (converts callback to promise)
function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// TODO: Implement the solution here

async function writeUserProfile() {
  try {
    // Your code here
    // 1. Prompt for user's name
    // 2. Prompt for favorite language
    // 3. Create a formatted message
    // 4. Write to profile.txt
    // 5. Read and display the file
    // 6. Close readline interface

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    rl.close();
  }
}

// Don't forget to call your function!
// writeUserProfile();

/**
 * TESTING YOUR SOLUTION:
 *
 * 1. Run your solution:
 *    node exercise-2.js
 *
 * 2. Expected interaction:
 *    What is your name? John
 *    What is your favorite programming language? JavaScript
 *    ✓ Profile saved to profile.txt
 *
 *    File contents:
 *    Name: John
 *    Favorite Language: JavaScript
 *
 * 3. Verify:
 *    Check that profile.txt exists
 *    Open it and verify the content is correct
 *
 * EXAMPLE OUTPUT:
 * ─────────────────────────────────────
 * What is your name? Alice
 * What is your favorite programming language? Python
 * ✓ Profile saved to profile.txt
 *
 * File contents:
 * ─────────────────────────────────────
 * Name: Alice
 * Favorite Language: Python
 * Created: 2024-01-15T10:30:00.000Z
 * ─────────────────────────────────────
 */

/**
 * BONUS CHALLENGE IDEAS:
 *
 * 1. Multiple Prompts:
 *    - Age
 *    - City
 *    - Hobbies (comma-separated)
 *
 * 2. JSON Format:
 *    {
 *      "name": "Alice",
 *      "language": "Python",
 *      "timestamp": "2024-01-15T10:30:00.000Z"
 *    }
 *
 * 3. Overwrite Protection:
 *    File exists. Overwrite? (y/n):
 *
 * 4. Append Mode:
 *    Allow adding multiple profiles to the same file
 */

/**
 * LEARNING NOTES:
 *
 * Write down what you learned:
 * - How does readline work?
 * - How do you convert callbacks to promises?
 * - What's the difference between writeFile and appendFile?
 * - Why is it important to close the readline interface?
 */
