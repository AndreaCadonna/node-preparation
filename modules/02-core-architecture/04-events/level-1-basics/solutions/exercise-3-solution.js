/**
 * Exercise 3 Solution: Using once() for One-Time Events
 */

const EventEmitter = require('events');

// Create the Game class
class Game extends EventEmitter {
  levelUp(player, level) {
    this.emit('levelUp', player, level);
  }
}

// Create an instance
const game = new Game();

// Add a regular listener for all level ups
game.on('levelUp', (player, level) => {
  console.log(`Player ${player} reached level ${level}`);
});

// Add a once() listener for reaching level 10
game.once('levelUp', (player, level) => {
  if (level === 10) {
    console.log(`🎉 Congratulations ${player}! You reached level 10 for the first time!`);
  }
});

// Alternative approach: Check level inside once
game.once('level10', (player) => {
  console.log(`🎉 Congratulations ${player}! You reached level 10 for the first time!`);
});

// Modified Game class to emit specific level events
class GameV2 extends EventEmitter {
  levelUp(player, level) {
    this.emit('levelUp', player, level);
    if (level === 10) {
      this.emit('level10', player);
    }
  }
}

const game2 = new GameV2();

game2.on('levelUp', (player, level) => {
  console.log(`Player ${player} reached level ${level}`);
});

game2.once('level10', (player) => {
  console.log(`🎉 Congratulations ${player}! You reached level 10 for the first time!`);
});

// Test: Level up to 9, 10, and 10 again
console.log('=== Testing ===');
game2.levelUp('Alice', 9);
game2.levelUp('Alice', 10);
game2.levelUp('Alice', 10); // No celebration this time

/*
 * Output:
 * === Testing ===
 * Player Alice reached level 9
 * Player Alice reached level 10
 * 🎉 Congratulations Alice! You reached level 10 for the first time!
 * Player Alice reached level 10
 */
