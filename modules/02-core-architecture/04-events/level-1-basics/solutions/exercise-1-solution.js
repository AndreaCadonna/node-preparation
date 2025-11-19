/**
 * Exercise 1 Solution: Create a Simple Event Emitter
 */

const EventEmitter = require('events');

// Create the Bell class
class Bell extends EventEmitter {
  ring() {
    this.emit('ring');
  }
}

// Create an instance
const doorbell = new Bell();

// Add a listener for the 'ring' event
doorbell.on('ring', () => {
  console.log('Ding dong!');
});

// Test: Ring the bell multiple times
doorbell.ring();
doorbell.ring();
doorbell.ring();

/*
 * Output:
 * Ding dong!
 * Ding dong!
 * Ding dong!
 */
