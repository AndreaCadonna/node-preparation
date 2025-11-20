# Level 1: Cluster Basics

Welcome to Level 1 of the Cluster module! This level introduces you to the fundamentals of Node.js clustering.

## Learning Objectives

By the end of this level, you will:

- ✅ Understand what clustering is and why it matters
- ✅ Create basic clustered applications
- ✅ Understand master and worker processes
- ✅ Fork worker processes
- ✅ Handle basic cluster events
- ✅ Implement simple worker monitoring
- ✅ Understand load distribution basics
- ✅ Build simple multi-core servers

## Topics Covered

### 1. Clustering Fundamentals
- What is clustering?
- Why use clustering?
- Single-thread vs multi-process
- CPU core utilization

### 2. Master-Worker Pattern
- Master process responsibilities
- Worker process responsibilities
- Process identification
- Basic process forking

### 3. Basic Cluster Setup
- Creating clustered applications
- Forking workers
- Worker lifecycle
- Basic event handling

### 4. Load Balancing Basics
- Automatic load distribution
- Shared server ports
- Connection distribution
- Basic performance benefits

## Examples

This level includes 6 practical examples:

1. **[01-basic-cluster.js](./examples/01-basic-cluster.js)** - Simple cluster setup
2. **[02-worker-identification.js](./examples/02-worker-identification.js)** - Identifying processes
3. **[03-cluster-events.js](./examples/03-cluster-events.js)** - Handling cluster events
4. **[04-worker-restart.js](./examples/04-worker-restart.js)** - Automatic worker restart
5. **[05-http-cluster.js](./examples/05-http-cluster.js)** - Clustered HTTP server
6. **[06-worker-communication.js](./examples/06-worker-communication.js)** - Basic IPC

## Exercises

Test your understanding with 5 hands-on exercises:

1. **[exercise-1.js](./exercises/exercise-1.js)** - Create your first cluster
2. **[exercise-2.js](./exercises/exercise-2.js)** - Fork specific number of workers
3. **[exercise-3.js](./exercises/exercise-3.js)** - Handle worker exits
4. **[exercise-4.js](./exercises/exercise-4.js)** - Build clustered web server
5. **[exercise-5.js](./exercises/exercise-5.js)** - Worker communication

## Conceptual Guides

Deep dive into specific topics:

1. **[01-clustering-overview.md](./guides/01-clustering-overview.md)** - Introduction to clustering
2. **[02-master-worker-pattern.md](./guides/02-master-worker-pattern.md)** - Understanding the pattern
3. **[03-forking-workers.md](./guides/03-forking-workers.md)** - Creating worker processes
4. **[04-cluster-events.md](./guides/04-cluster-events.md)** - Event system
5. **[05-load-balancing-basics.md](./guides/05-load-balancing-basics.md)** - Load distribution
6. **[06-basic-ipc.md](./guides/06-basic-ipc.md)** - Inter-process communication

## Solutions

Complete solutions for all exercises are available in the [solutions](./solutions/) directory.

## Getting Started

1. **Read the concepts** in [CONCEPTS.md](../CONCEPTS.md)
2. **Study the examples** - Run each one and understand the code
3. **Try the exercises** - Challenge yourself before checking solutions
4. **Read the guides** - Deepen your understanding

## Running the Examples

```bash
# Navigate to examples directory
cd examples

# Run an example
node 01-basic-cluster.js

# Observe multiple processes being created
# See how workers share the same port
```

## Testing Your Knowledge

Before moving to Level 2, make sure you can:

- [ ] Explain what clustering is and its benefits
- [ ] Create a basic clustered application
- [ ] Understand the difference between master and worker
- [ ] Fork worker processes
- [ ] Handle the 'exit' event to restart workers
- [ ] Build a simple clustered HTTP server
- [ ] Send messages between master and workers

## Common Mistakes to Avoid

1. **Not restarting workers** - Always handle the 'exit' event
2. **Forking too many workers** - Match CPU count
3. **Expecting shared memory** - Each worker has separate memory
4. **Not identifying process type** - Check isMaster/isWorker

## Time Estimate

- **Examples**: 1 hour
- **Exercises**: 1-2 hours
- **Guides**: 1 hour
- **Total**: 3-4 hours

## Next Steps

Once you've completed this level, proceed to [Level 2: Intermediate](../level-2-intermediate/README.md) to learn about:
- Graceful shutdown patterns
- Advanced worker management
- Complex IPC
- Health monitoring

---

Ready to begin? Start with **[01-basic-cluster.js](./examples/01-basic-cluster.js)**!
