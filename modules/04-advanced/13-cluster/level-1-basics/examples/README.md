# Level 1: Examples

This directory contains 6 practical examples demonstrating cluster basics.

## Examples Overview

### 01-basic-cluster.js
**Concept**: Introduction to clustering
- Creating master and worker processes
- Forking workers
- Process identification
- Basic cluster structure

**Run**: `node 01-basic-cluster.js`

---

### 02-worker-identification.js
**Concept**: Understanding worker identity
- Worker IDs vs Process IDs
- Accessing worker information
- cluster.workers object
- Worker states

**Run**: `node 02-worker-identification.js`

---

### 03-cluster-events.js
**Concept**: Cluster lifecycle events
- fork, online, listening events
- disconnect, exit events
- Event handling patterns
- Worker lifecycle

**Run**: `node 03-cluster-events.js`

---

### 04-worker-restart.js
**Concept**: Fault tolerance
- Handling worker crashes
- Automatic restart on exit
- Maintaining worker count
- Resilience patterns

**Run**: `node 04-worker-restart.js`

---

### 05-http-cluster.js
**Concept**: Clustered web servers
- HTTP server clustering
- Shared port handling
- Load distribution
- Performance scaling

**Run**: `node 05-http-cluster.js`
**Test**: Open `http://localhost:8000` or use `curl http://localhost:8000`

---

### 06-worker-communication.js
**Concept**: Inter-process communication
- Master to worker messages
- Worker to master messages
- Message patterns
- IPC basics

**Run**: `node 06-worker-communication.js`

---

## How to Use These Examples

1. **Read the code** - Each file is heavily commented
2. **Run the example** - Execute and observe the output
3. **Experiment** - Modify values and see what changes
4. **Move to next** - Progress through examples in order

## Learning Path

We recommend studying examples in this order:
1. Basic cluster setup (01)
2. Worker identification (02)
3. Cluster events (03)
4. Worker restart (04)
5. HTTP clustering (05)
6. Worker communication (06)

## Common Commands

```bash
# Run an example
node 01-basic-cluster.js

# Run with output to file
node 02-worker-identification.js > output.txt

# Test HTTP server (example 05)
curl http://localhost:8000

# Multiple requests
for i in {1..10}; do curl http://localhost:8000; done
```

## Key Concepts Covered

- Master-worker architecture
- Process forking
- Worker lifecycle
- Event handling
- Automatic restart
- Load balancing
- Inter-process communication
