/**
 * Exercise 1: Detect and Fix Memory Leaks
 *
 * Task:
 * You have a service that creates temporary workers. Each worker registers event
 * listeners but never removes them, causing a memory leak. Your job is to:
 *
 * 1. Identify the memory leak
 * 2. Implement proper cleanup
 * 3. Add leak detection
 * 4. Verify the fix works
 *
 * Requirements:
 * - Create a Worker class that uses event listeners
 * - Implement proper cleanup in a destroy() method
 * - Add leak detection that warns when listener count exceeds threshold
 * - Test by creating and destroying multiple workers
 * - Verify listener count returns to normal after cleanup
 */

const EventEmitter = require('events');

// Simulated task scheduler
const taskScheduler = new EventEmitter();

// YOUR CODE HERE

// Create a Worker class that:
// 1. Listens to 'task:assigned' events from taskScheduler
// 2. Has a destroy() method that removes listeners
// 3. Stores handler references for cleanup


// Create a LeakDetector that:
// 1. Monitors listener counts on an EventEmitter
// 2. Warns when count exceeds a threshold
// 3. Reports current listener statistics


// Test your implementation:
// 1. Create 10 workers
// 2. Show leak detection warnings if cleanup is not called
// 3. Call destroy() on all workers
// 4. Verify listener count is back to normal


/*
 * Expected output (with proper cleanup):
 * Created worker 1
 * Created worker 2
 * ...
 * Created worker 10
 * Listener count: 10
 *
 * Destroying all workers...
 * Worker 1 destroyed
 * Worker 2 destroyed
 * ...
 * Worker 10 destroyed
 * Listener count after cleanup: 0
 * ✅ No memory leaks detected!
 */

// After completing, compare with: solutions/exercise-1-solution.js
