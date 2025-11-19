# Level 1: Events Basics

Master the fundamentals of event-driven programming with Node.js EventEmitter.

## Learning Objectives

By the end of this level, you will be able to:
- Understand what EventEmitter is and when to use it
- Create and use event emitters
- Listen to events using `on()` and `once()`
- Emit events with and without data
- Remove event listeners properly
- Handle the special 'error' event
- Understand basic event-driven patterns

## Overview

The Events module is the foundation of Node.js's asynchronous, event-driven architecture. Almost every major Node.js API is built on EventEmitter - from HTTP servers to file streams. Understanding events is essential for mastering Node.js.

---

## Topics Covered

### 1. EventEmitter Basics
- Importing and using the events module
- Creating event emitter instances
- Understanding the observer pattern
- Event-driven vs traditional programming

### 2. Listening to Events
- Using `on()` to register listeners
- Understanding listener execution order
- Handling multiple listeners for one event
- The `this` context in event handlers

### 3. Emitting Events
- Using `emit()` to trigger events
- Passing arguments to event listeners
- Return values from emit()
- Event names and conventions

### 4. One-Time Listeners
- Using `once()` for single-use listeners
- When to use once vs on
- Automatic listener cleanup

### 5. Removing Listeners
- Using `removeListener()` and `off()`
- Removing all listeners for an event
- Preventing memory leaks
- Listener lifecycle management

### 6. Error Events
- The special 'error' event
- Why error handling is critical
- Process crashes without error handlers
- Best practices for error events

---

## Examples

This level includes 8 comprehensive examples:

1. **[01-basic-emitter.js](./examples/01-basic-emitter.js)**
   - Creating a simple EventEmitter
   - Basic on() and emit() usage
   - First event-driven program

2. **[02-multiple-listeners.js](./examples/02-multiple-listeners.js)**
   - Adding multiple listeners to one event
   - Understanding execution order
   - Listener arguments

3. **[03-once-listener.js](./examples/03-once-listener.js)**
   - Using once() for one-time events
   - Comparing once vs on
   - Automatic cleanup

4. **[04-passing-data.js](./examples/04-passing-data.js)**
   - Passing data through events
   - Multiple arguments
   - Object and array arguments

5. **[05-removing-listeners.js](./examples/05-removing-listeners.js)**
   - Removing specific listeners
   - Using removeListener() and off()
   - Checking listener counts

6. **[06-error-events.js](./examples/06-error-events.js)**
   - Handling error events
   - Preventing process crashes
   - Error event best practices

7. **[07-extending-eventemitter.js](./examples/07-extending-eventemitter.js)**
   - Creating custom classes with EventEmitter
   - Using inheritance
   - Real-world patterns

8. **[08-practical-example.js](./examples/08-practical-example.js)**
   - Building a simple event-driven system
   - Combining concepts
   - Practical use case

### Running Examples

```bash
# Run any example
node examples/01-basic-emitter.js

# Run all examples
for file in examples/*.js; do
  echo "Running $file"
  node "$file"
  echo "---"
done
```

---

## Exercises

Test your understanding with 5 practical exercises:

1. **[exercise-1.js](./exercises/exercise-1.js)** - Create a simple event emitter
2. **[exercise-2.js](./exercises/exercise-2.js)** - Implement multiple listeners
3. **[exercise-3.js](./exercises/exercise-3.js)** - Use once() for one-time events
4. **[exercise-4.js](./exercises/exercise-4.js)** - Remove event listeners
5. **[exercise-5.js](./exercises/exercise-5.js)** - Pass data with events

### Exercise Guidelines

1. Read the exercise description in each file
2. Write your solution where indicated
3. Test your solution by running the file
4. Compare with the solution only after attempting

### Checking Solutions

Solutions are available in the `solutions/` directory:

```bash
# After attempting, compare your solution
node solutions/exercise-1-solution.js
```

---

## Conceptual Guides

For deeper understanding, read these guides:

1. **[01-what-are-events.md](./guides/01-what-are-events.md)**
   - What is event-driven programming?
   - Observer pattern explained
   - When to use events

2. **[02-on-vs-once.md](./guides/02-on-vs-once.md)**
   - Difference between on() and once()
   - Use cases for each
   - Performance implications

3. **[03-error-events.md](./guides/03-error-events.md)**
   - Why error events are special
   - Error handling strategies
   - Preventing crashes

---

## Key Concepts

### Basic EventEmitter Usage

```javascript
const EventEmitter = require('events');
const emitter = new EventEmitter();

// Listen to an event
emitter.on('greet', (name) => {
  console.log(`Hello, ${name}!`);
});

// Emit an event
emitter.emit('greet', 'World');
// Output: Hello, World!
```

### Multiple Listeners

```javascript
const emitter = new EventEmitter();

emitter.on('data', () => console.log('First listener'));
emitter.on('data', () => console.log('Second listener'));
emitter.on('data', () => console.log('Third listener'));

emitter.emit('data');
// Output:
// First listener
// Second listener
// Third listener
```

### Once vs On

```javascript
const emitter = new EventEmitter();

// Persistent listener - triggers every time
emitter.on('repeat', () => console.log('On: I run every time'));

// One-time listener - triggers once then removes itself
emitter.once('single', () => console.log('Once: I run only once'));

emitter.emit('repeat'); // On: I run every time
emitter.emit('repeat'); // On: I run every time

emitter.emit('single'); // Once: I run only once
emitter.emit('single'); // (nothing - listener was removed)
```

### Error Events

```javascript
const emitter = new EventEmitter();

// Without error handler - crashes the process!
// emitter.emit('error', new Error('Oops')); // Don't do this!

// With error handler - safe
emitter.on('error', (err) => {
  console.error('Error occurred:', err.message);
});

emitter.emit('error', new Error('Oops')); // Safe now
```

---

## Common Patterns

### Pattern 1: Basic Event System

```javascript
const EventEmitter = require('events');

class Door extends EventEmitter {
  open() {
    console.log('Door is opening...');
    this.emit('open');
  }

  close() {
    console.log('Door is closing...');
    this.emit('close');
  }
}

const door = new Door();

door.on('open', () => console.log('Door opened!'));
door.on('close', () => console.log('Door closed!'));

door.open();
door.close();
```

### Pattern 2: Event with Data

```javascript
class User extends EventEmitter {
  login(username) {
    console.log(`${username} is logging in...`);
    this.emit('login', {
      username,
      timestamp: Date.now()
    });
  }
}

const user = new User();

user.on('login', (data) => {
  console.log(`User ${data.username} logged in at ${data.timestamp}`);
});

user.login('alice');
```

### Pattern 3: Cleanup Pattern

```javascript
const emitter = new EventEmitter();

function handleData(data) {
  console.log('Received:', data);
}

// Add listener
emitter.on('data', handleData);

// Use it
emitter.emit('data', 'test');

// Clean up when done
emitter.removeListener('data', handleData);
// or
emitter.off('data', handleData);
```

---

## Best Practices

### ✅ DO

- Always handle 'error' events
- Remove listeners when no longer needed
- Use descriptive event names
- Use once() for one-time events
- Keep event handlers simple and focused

### ❌ DON'T

- Don't emit 'error' without a listener
- Don't forget to remove listeners (memory leaks!)
- Don't use generic event names like 'event' or 'data'
- Don't perform heavy synchronous work in handlers
- Don't rely on listener execution order for critical logic

---

## Common Mistakes

### Mistake 1: No Error Handler

```javascript
// ❌ Wrong - will crash the process
const emitter = new EventEmitter();
emitter.emit('error', new Error('Oops'));

// ✅ Correct - error is handled
emitter.on('error', (err) => {
  console.error('Error:', err);
});
emitter.emit('error', new Error('Oops'));
```

### Mistake 2: Not Removing Listeners

```javascript
// ❌ Wrong - memory leak
function createHandler() {
  return () => console.log('Handle event');
}

setInterval(() => {
  emitter.on('data', createHandler()); // Leak!
}, 1000);

// ✅ Correct - remove when done
const handler = createHandler();
emitter.on('data', handler);
// Later...
emitter.removeListener('data', handler);
```

### Mistake 3: Anonymous Functions Can't Be Removed

```javascript
// ❌ Wrong - can't remove anonymous function
emitter.on('data', () => console.log('data'));
// Can't remove this listener!

// ✅ Correct - use named function
const handleData = () => console.log('data');
emitter.on('data', handleData);
// Can remove: emitter.off('data', handleData);
```

---

## Testing Your Knowledge

After completing this level, you should be able to answer:

1. What is EventEmitter and why is it important in Node.js?
2. What's the difference between `on()` and `once()`?
3. Why is the 'error' event special?
4. How do you remove an event listener?
5. What happens if you emit an 'error' event with no listener?
6. In what order are event listeners called?
7. How do you pass data to event listeners?
8. When should you use `once()` instead of `on()`?

---

## Next Steps

Once you've completed this level:

1. ✅ Complete all exercises
2. ✅ Read all conceptual guides
3. ✅ Understand on() vs once()
4. ✅ Master error event handling
5. ➡️ Move to [Level 2: Intermediate](../level-2-intermediate/README.md)

---

## Time Estimate

- **Examples**: 20-30 minutes
- **Exercises**: 30-45 minutes
- **Guides**: 20-30 minutes
- **Total**: 1-2 hours

---

## Summary

Level 1 covers the essential EventEmitter operations you'll use daily:
- Creating and using event emitters
- Listening with on() and once()
- Emitting events with data
- Removing listeners properly
- Handling error events safely

These fundamentals are the building blocks for all event-driven programming in Node.js. Master them, and you'll be ready for more advanced topics in Level 2!
