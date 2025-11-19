/**
 * Exercise 3: Using once() for One-Time Events
 *
 * Task:
 * Create a game system that announces when a player reaches level 10 for the first time.
 * The celebration should only happen once, even if the player reaches level 10 multiple times.
 *
 * Requirements:
 * 1. Create a Game class that extends EventEmitter
 * 2. Implement a levelUp(player, level) method that emits a 'levelUp' event
 * 3. Use once() to add a listener that celebrates reaching level 10
 * 4. Use on() to add a regular listener that logs all level ups
 * 5. Test by leveling up to 9, then 10, then 10 again
 */

const EventEmitter = require('events');

// YOUR CODE HERE
// Create the Game class

// Create an instance

// Add a regular listener for all level ups

// Add a once() listener for reaching level 10

// Test: Level up to 9, 10, and 10 again


/*
 * Expected output:
 * Player Alice reached level 9
 * Player Alice reached level 10
 * 🎉 Congratulations Alice! You reached level 10 for the first time!
 * Player Alice reached level 10
 * (Notice: No congratulations the second time)
 */

// After completing, compare with: solutions/exercise-3-solution.js
