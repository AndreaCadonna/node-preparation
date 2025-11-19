# Module 4: Events

Master Node.js event-driven architecture with the EventEmitter.

## Why This Module Matters

The Events module is the foundation of Node.js's event-driven architecture. Understanding EventEmitter is crucial because nearly all Node.js core modules extend from it - HTTP servers, streams, file system watchers, and more. Mastering events means mastering how Node.js applications communicate and flow.

**Real-world applications:**
- Building web servers and APIs
- Implementing real-time features (chat, notifications)
- Creating plugin systems and middleware
- Designing modular, decoupled applications
- Handling asynchronous workflows
- Building event-driven microservices

---

## What You'll Learn

By completing this module, you'll master:

### Technical Skills
- Creating and using EventEmitters
- Listening to and emitting events
- Managing event listeners lifecycle
- Error handling in event-driven code
- Building custom event emitters
- Advanced event patterns

### Practical Applications
- Build scalable event-driven applications
- Prevent memory leaks from listeners
- Implement pub-sub patterns
- Create loosely coupled systems
- Handle complex asynchronous flows
- Design production-ready event systems

---

## Module Structure

This module is divided into three progressive levels:

### [Level 1: Basics](./level-1-basics/README.md)
**Time**: 1-2 hours

Learn the fundamentals of event-driven programming:
- Understanding EventEmitter
- Listening to and emitting events
- Using `on()` vs `once()`
- Removing event listeners
- Passing data with events
- Basic event patterns

**You'll be able to:**
- Create simple event emitters
- Add and remove listeners
- Emit events with data
- Use one-time listeners
- Understand event flow

### [Level 2: Intermediate](./level-2-intermediate/README.md)
**Time**: 2-3 hours

Advanced event emitter techniques:
- Extending EventEmitter
- Error event handling
- Listener management
- Event namespacing
- Prepending listeners
- Maximum listeners configuration

**You'll be able to:**
- Create custom event emitter classes
- Handle errors properly
- Manage listener limits
- Build event-driven systems
- Implement middleware patterns
- Debug event flow

### [Level 3: Advanced](./level-3-advanced/README.md)
**Time**: 3-4 hours

Production-ready event systems:
- Memory leak detection and prevention
- Performance optimization
- Complex event patterns
- Event sourcing
- Publish-subscribe systems
- Event-driven architecture

**You'll be able to:**
- Detect and fix memory leaks
- Build high-performance event systems
- Implement event sourcing
- Create pub-sub systems
- Design event-driven applications
- Handle complex async patterns

---

## Prerequisites

- Basic JavaScript knowledge
- Understanding of asynchronous programming
- Familiarity with callbacks (recommended)
- Node.js installed (v14+)

---

## Learning Path

### Recommended Approach

1. **Read** the [CONCEPTS.md](./CONCEPTS.md) file first for foundational understanding
2. **Start** with Level 1 and progress sequentially
3. **Study** the examples in each level
4. **Complete** the exercises before checking solutions
5. **Read** the conceptual guides for deeper understanding
6. **Practice** by building the suggested projects

### Alternative Approaches

**Fast Track** (If you're experienced):
- Skim Level 1
- Focus on Level 2 and 3
- Complete advanced exercises

**Deep Dive** (If you want mastery):
- Read all guides thoroughly
- Complete all exercises
- Build additional projects
- Study the solutions for alternative approaches

---

## Key Concepts

### Event Emitter Basics

EventEmitter is the core class for event-driven programming:

```javascript
const EventEmitter = require('events');
const emitter = new EventEmitter();

// Listen to an event
emitter.on('data', (msg) => {
  console.log('Received:', msg);
});

// Emit an event
emitter.emit('data', 'Hello World');
```

### Extending EventEmitter

Build custom event-driven classes:

```javascript
class Server extends EventEmitter {
  start() {
    this.emit('start');
    console.log('Server started');
  }
}

const server = new Server();
server.on('start', () => console.log('Server is ready!'));
server.start();
```

### Error Events

Always handle error events to prevent crashes:

```javascript
emitter.on('error', (err) => {
  console.error('Error occurred:', err);
});

// Without an error listener, this would crash the process
emitter.emit('error', new Error('Something went wrong'));
```

### Memory Management

Remove listeners when no longer needed:

```javascript
function handleData(data) {
  console.log(data);
}

emitter.on('data', handleData);

// Remove when done
emitter.removeListener('data', handleData);
// or
emitter.off('data', handleData);
```

---

## Practical Examples

### Example 1: Simple Event System

```javascript
const EventEmitter = require('events');

class UserManager extends EventEmitter {
  createUser(name) {
    // Create user...
    this.emit('userCreated', { name, timestamp: Date.now() });
  }
}

const users = new UserManager();

users.on('userCreated', (user) => {
  console.log(`Welcome ${user.name}!`);
});

users.createUser('Alice');
```

### Example 2: Asynchronous Event Flow

```javascript
const EventEmitter = require('events');

class DataProcessor extends EventEmitter {
  async process(data) {
    this.emit('processing', data);

    try {
      const result = await this.transform(data);
      this.emit('processed', result);
    } catch (error) {
      this.emit('error', error);
    }
  }

  async transform(data) {
    // Simulate async work
    return new Promise(resolve => {
      setTimeout(() => resolve(data.toUpperCase()), 100);
    });
  }
}

const processor = new DataProcessor();

processor.on('processing', (data) => {
  console.log('Processing:', data);
});

processor.on('processed', (result) => {
  console.log('Result:', result);
});

processor.on('error', (err) => {
  console.error('Failed:', err.message);
});

processor.process('hello');
```

### Example 3: Once Listeners

```javascript
const EventEmitter = require('events');
const emitter = new EventEmitter();

// This will only run once
emitter.once('connection', () => {
  console.log('First connection established!');
});

emitter.emit('connection'); // Logs message
emitter.emit('connection'); // Does nothing
```

---

## Common Pitfalls

### ❌ Forgetting Error Handlers

```javascript
// Wrong - can crash your application
emitter.emit('error', new Error('Oops'));

// Correct - always handle errors
emitter.on('error', (err) => {
  console.error('Error:', err);
});
```

### ❌ Memory Leaks from Listeners

```javascript
// Wrong - listeners never removed
setInterval(() => {
  const emitter = getEmitter();
  emitter.on('data', handleData); // Memory leak!
}, 1000);

// Correct - remove listeners when done
const listener = (data) => handleData(data);
emitter.on('data', listener);
// Later...
emitter.removeListener('data', listener);
```

### ❌ Synchronous Event Handlers Blocking

```javascript
// Wrong - blocks event loop
emitter.on('data', (data) => {
  // Heavy synchronous work
  const result = expensiveOperation(data);
});

// Correct - async handling
emitter.on('data', async (data) => {
  const result = await expensiveOperation(data);
});
```

---

## Module Contents

### Documentation
- **[CONCEPTS.md](./CONCEPTS.md)** - Foundational concepts for the entire module
- **Level READMEs** - Specific guidance for each level

### Code Examples
- **8 examples per level** (24 total) - Practical demonstrations
- **Fully commented** - Learn from reading the code
- **Runnable** - Execute them to see results

### Exercises
- **5 exercises per level** (15 total) - Practice problems
- **Progressive difficulty** - Build your skills gradually
- **Complete solutions** - Check your work

### Conceptual Guides
- **14 in-depth guides** - Deep understanding of specific topics
- **Level 1**: 3 guides on fundamentals
- **Level 2**: 5 guides on intermediate patterns
- **Level 3**: 6 guides on advanced topics

---

## Getting Started

### Quick Start

1. **Read the concepts**:
   ```bash
   # Read the foundational concepts
   cat CONCEPTS.md
   ```

2. **Start Level 1**:
   ```bash
   cd level-1-basics
   cat README.md
   ```

3. **Run your first example**:
   ```bash
   node examples/01-basic-emitter.js
   ```

4. **Try an exercise**:
   ```bash
   node exercises/exercise-1.js
   ```

### Setting Up

No special setup is required! The events module is built into Node.js.

```javascript
// Just import and start using
const EventEmitter = require('events');
```

---

## Success Criteria

You'll know you've mastered this module when you can:

- [ ] Explain how EventEmitter works
- [ ] Create custom event emitter classes
- [ ] Handle errors in event-driven code properly
- [ ] Prevent memory leaks from listeners
- [ ] Implement pub-sub patterns
- [ ] Design event-driven architectures
- [ ] Optimize event system performance
- [ ] Debug complex event flows

---

## Additional Resources

### Official Documentation
- [Node.js Events Documentation](https://nodejs.org/api/events.html)

### Practice Projects
After completing this module, try building:
1. **Event Logger** - Centralized logging system
2. **Chat Server** - Real-time messaging with events
3. **Task Queue** - Event-driven job processing
4. **Plugin System** - Extensible application with events

### Related Modules
- **Module 5: Stream** - Streams extend EventEmitter
- **Module 6: Process** - Process events and signals
- **Module 7: HTTP** - HTTP servers use events
- **Module 12: Child Process** - Process communication events

---

## Questions or Issues?

- Review the [CONCEPTS.md](./CONCEPTS.md) for foundational understanding
- Check the examples for practical demonstrations
- Study the guides for deep dives into specific topics
- Review solutions after attempting exercises

---

## Let's Begin!

Start your journey with [Level 1: Basics](./level-1-basics/README.md) and build a solid foundation in event-driven programming.

Remember: Events are at the heart of Node.js. Master them, and you'll unlock the true power of asynchronous, event-driven architecture!
