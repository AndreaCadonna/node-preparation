# Level 1: Exercises

This directory contains 5 hands-on exercises to practice cluster basics.

## How to Use These Exercises

1. **Read the exercise file** - Understand the requirements
2. **Implement your solution** - Fill in the TODOs
3. **Test your code** - Run and verify it works
4. **Check the solution** - Compare with the provided solution
5. **Try bonus challenges** - Extend your learning

## Exercises

### Exercise 1: Create Your First Cluster
**File**: `exercise-1.js`
**Difficulty**: ⭐ Easy
**Time**: 15-20 minutes

Create a basic cluster with master and worker processes.

**Key Concepts**:
- Process identification
- Forking workers
- Basic logging

**Run**: `node exercise-1.js`

---

### Exercise 2: Fork Specific Number of Workers
**File**: `exercise-2.js`
**Difficulty**: ⭐ Easy
**Time**: 20-25 minutes

Create a cluster with workers matching CPU count.

**Key Concepts**:
- System information
- Dynamic worker count
- Worker tracking

**Run**: `node exercise-2.js`

---

### Exercise 3: Handle Worker Exits
**File**: `exercise-3.js`
**Difficulty**: ⭐⭐ Medium
**Time**: 25-30 minutes

Implement automatic worker restart on crash.

**Key Concepts**:
- Exit event handling
- Automatic restart
- Resilience patterns

**Run**: `node exercise-3.js`

---

### Exercise 4: Build a Clustered Web Server
**File**: `exercise-4.js`
**Difficulty**: ⭐⭐ Medium
**Time**: 30-40 minutes

Create a clustered HTTP server with load balancing.

**Key Concepts**:
- HTTP clustering
- Shared ports
- Load distribution
- Request handling

**Run**: `node exercise-4.js`
**Test**: `curl http://localhost:3000`

---

### Exercise 5: Worker Communication
**File**: `exercise-5.js`
**Difficulty**: ⭐⭐⭐ Challenging
**Time**: 40-50 minutes

Implement inter-process communication between master and workers.

**Key Concepts**:
- IPC messaging
- Message patterns
- Status reporting
- Command handling

**Run**: `node exercise-5.js`

---

## Solutions

Complete solutions with explanations are available in the `../solutions/` directory.

**Important**: Try to solve the exercises yourself before checking solutions!

## Tips for Success

1. **Start Simple**: Get basic functionality working first
2. **Test Often**: Run your code frequently to catch errors early
3. **Read Errors**: Error messages are helpful - read them carefully
4. **Use Console.log**: Add logging to understand program flow
5. **Experiment**: Try different approaches and see what works

## Common Issues

### Issue: Workers don't start
**Solution**: Check if you're forking in master process only

### Issue: Port already in use
**Solution**: Make sure no other process is using the port, or change the port number

### Issue: Messages not received
**Solution**: Verify you're using correct message sending/receiving methods

### Issue: Workers keep crashing
**Solution**: Check for errors in worker code, add error handling

## Learning Objectives

After completing these exercises, you should be able to:

- ✅ Create basic clustered applications
- ✅ Fork and manage workers
- ✅ Handle worker lifecycle events
- ✅ Build clustered HTTP servers
- ✅ Implement inter-process communication
- ✅ Handle worker failures gracefully

## Next Steps

Once you've completed all exercises:

1. Review the solutions
2. Try the bonus challenges
3. Move on to Level 2 exercises for more advanced topics

## Need Help?

- Review the examples in `../examples/`
- Read the guides in `../guides/`
- Check the CONCEPTS.md file
- Study the solutions (but try first!)
