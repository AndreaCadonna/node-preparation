/**
 * Exercise 4 Solution: Removing Event Listeners
 */

const EventEmitter = require('events');

// Create the Timer class
class Timer extends EventEmitter {
  start() {
    this.interval = setInterval(() => {
      this.emit('tick');
    }, 500);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

// Create an instance
const timer = new Timer();

// Create a listener function that removes itself after 3 ticks
let tickCount = 0;
function countTicks() {
  tickCount++;
  console.log(`Tick ${tickCount}`);

  if (tickCount >= 3) {
    timer.removeListener('tick', countTicks);
    console.log('(First listener removed after 3 ticks)');
  }
}

// Add the listener
timer.on('tick', countTicks);

// Add a permanent listener that keeps running
timer.on('tick', () => {
  console.log('Still listening...');
});

// Start the timer
timer.start();

// Stop after 7 ticks to end the example
setTimeout(() => {
  timer.stop();
  console.log('\nTimer stopped');
}, 3500);

/*
 * Output:
 * Tick 1
 * Still listening...
 * Tick 2
 * Still listening...
 * Tick 3
 * Still listening...
 * (First listener removed after 3 ticks)
 * Still listening...
 * Still listening...
 * Still listening...
 * Still listening...
 *
 * Timer stopped
 */
