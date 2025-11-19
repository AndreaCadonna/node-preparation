/**
 * Exercise 2 Solution: Multiple Listeners
 */

const EventEmitter = require('events');

// Create the TrafficLight class
class TrafficLight extends EventEmitter {
  changeColor(color) {
    this.emit('colorChanged', color);
  }
}

// Create an instance
const light = new TrafficLight();

// Listener 1: Log the new color
light.on('colorChanged', (color) => {
  console.log(`Color changed to: ${color}`);
});

// Listener 2: Message for drivers
light.on('colorChanged', (color) => {
  if (color === 'green') {
    console.log('Drivers: GO!');
  } else if (color === 'yellow') {
    console.log('Drivers: SLOW DOWN!');
  } else if (color === 'red') {
    console.log('Drivers: STOP!');
  }
});

// Listener 3: Message for pedestrians
light.on('colorChanged', (color) => {
  if (color === 'green') {
    console.log('Pedestrians: STOP!');
  } else if (color === 'yellow') {
    console.log('Pedestrians: GET READY!');
  } else if (color === 'red') {
    console.log('Pedestrians: WALK!');
  }
});

// Test: Change colors
console.log('=== Red Light ===');
light.changeColor('red');

console.log('\n=== Yellow Light ===');
light.changeColor('yellow');

console.log('\n=== Green Light ===');
light.changeColor('green');

/*
 * Output:
 * === Red Light ===
 * Color changed to: red
 * Drivers: STOP!
 * Pedestrians: WALK!
 *
 * === Yellow Light ===
 * Color changed to: yellow
 * Drivers: SLOW DOWN!
 * Pedestrians: GET READY!
 *
 * === Green Light ===
 * Color changed to: green
 * Drivers: GO!
 * Pedestrians: STOP!
 */
