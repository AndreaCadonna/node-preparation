/**
 * Exercise 2: Multiple Listeners
 *
 * Task:
 * Create a traffic light system that emits color change events.
 * Add three different listeners that respond to the color change in different ways.
 *
 * Requirements:
 * 1. Create a TrafficLight class that extends EventEmitter
 * 2. Implement a changeColor(color) method that emits a 'colorChanged' event
 * 3. Add three listeners:
 *    - One that logs the new color
 *    - One that logs a message for drivers
 *    - One that logs a message for pedestrians
 * 4. Test with different colors: 'red', 'yellow', 'green'
 */

const EventEmitter = require('events');

// YOUR CODE HERE
// Create the TrafficLight class

// Create an instance

// Add three different listeners for 'colorChanged'

// Test: Change colors


/*
 * Expected output (for green):
 * Color changed to: green
 * Drivers: GO!
 * Pedestrians: STOP!
 *
 * (Similar output for red and yellow with appropriate messages)
 */

// After completing, compare with: solutions/exercise-2-solution.js
