/**
 * Exercise 4: Removing Event Listeners
 *
 * Task:
 * Create a timer that emits 'tick' events. Add a listener that should only listen
 * for the first 3 ticks, then remove itself.
 *
 * Requirements:
 * 1. Create a Timer class that extends EventEmitter
 * 2. Implement a start() method that emits 'tick' every 500ms
 * 3. Create a listener function that:
 *    - Counts the ticks
 *    - Logs each tick
 *    - Removes itself after 3 ticks
 * 4. Add another permanent listener that logs "Still listening..."
 * 5. Test and verify the first listener stops after 3 ticks
 */

const EventEmitter = require('events');

// YOUR CODE HERE
// Create the Timer class

// Create an instance

// Create a listener function that removes itself after 3 ticks
// (Remember: must be a named function to remove it!)

// Add the listener

// Add a permanent listener that keeps running

// Start the timer


/*
 * Expected output:
 * Tick 1
 * Still listening...
 * Tick 2
 * Still listening...
 * Tick 3
 * Still listening...
 * Still listening...
 * Still listening...
 * (Only "Still listening..." continues after tick 3)
 */

// After completing, compare with: solutions/exercise-4-solution.js
