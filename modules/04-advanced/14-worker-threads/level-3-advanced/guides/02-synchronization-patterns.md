# Synchronization Patterns in Worker Threads

## Why Synchronization Matters

When multiple threads access shared memory, synchronization prevents race conditions and ensures data consistency. This guide covers essential synchronization patterns using Atomics.

## The Synchronization Problem

### Race Conditions Without Synchronization

```javascript
// Shared counter (NOT thread-safe without atomics)
const shared = new Int32Array(new SharedArrayBuffer(4));

// Multiple workers doing this:
let temp = shared[0];  // Thread 1 reads 0
temp = temp + 1;        // Thread 1 computes 1
shared[0] = temp;       // Thread 1 writes 1

// Thread 2 might do the same in parallel:
// Reads 0, computes 1, writes 1
// Expected: 2, Actual: 1 (race condition!)
```

### Solution: Atomic Operations

```javascript
// Thread-safe increment
Atomics.add(shared, 0, 1);

// Always correct, no race conditions
```

## Basic Synchronization Primitives

### 1. Atomic Read/Write

```javascript
const sab = new SharedArrayBuffer(4);
const int32 = new Int32Array(sab);

// Atomic write (thread-safe)
Atomics.store(int32, 0, 42);

// Atomic read (thread-safe)
const value = Atomics.load(int32, 0);

// Why atomic operations matter:
// Regular operations (int32[0] = 42) might not be atomic on all platforms
// Atomics guarantee atomicity across all platforms
```

### 2. Compare-And-Swap (CAS)

The foundation of lock-free programming:

```javascript
// Only update if value hasn't changed
const oldValue = Atomics.compareExchange(
  int32,
  index,
  expectedValue,
  newValue
);

// Returns the value that was at int32[index]
// If it equals expectedValue, it was replaced with newValue
// If not, nothing changed

// Example: Increment with CAS
function atomicIncrement(array, index) {
  while (true) {
    const current = Atomics.load(array, index);
    const next = current + 1;
    const prev = Atomics.compareExchange(array, index, current, next);

    if (prev === current) {
      // Success! Value was current, now it's next
      return next;
    }
    // Failed, another thread changed it, retry
  }
}
```

### 3. Wait and Notify

Block threads until conditions are met:

```javascript
// Worker 1: Wait for value to change
Atomics.wait(int32, index, expectedValue, timeout);
// Returns: 'ok', 'not-equal', 'timed-out'

// Worker 2: Change value and notify
Atomics.store(int32, index, newValue);
Atomics.notify(int32, index, count); // Wake up 'count' waiters
```

## Synchronization Patterns

### Pattern 1: Spin Lock

Simplest lock, busy-waits:

```javascript
class SpinLock {
  constructor(sharedBuffer, index = 0) {
    this.int32 = new Int32Array(sharedBuffer);
    this.index = index;
  }

  lock() {
    // Spin until we acquire the lock
    while (Atomics.compareExchange(this.int32, this.index, 0, 1) !== 0) {
      // Lock is held by another thread, keep trying
      // This is "spinning" - wastes CPU
    }
  }

  unlock() {
    Atomics.store(this.int32, this.index, 0);
  }
}

// Usage
const lockBuffer = new SharedArrayBuffer(4);
const lock = new SpinLock(lockBuffer);

// In worker
lock.lock();
try {
  // Critical section - only one thread at a time
  sharedData[0]++;
} finally {
  lock.unlock(); // Always unlock!
}
```

**Pros:** Simple, fast when contention is low
**Cons:** Wastes CPU when waiting

### Pattern 2: Mutex (Using Wait/Notify)

More efficient lock:

```javascript
class Mutex {
  constructor(sharedBuffer, index = 0) {
    this.int32 = new Int32Array(sharedBuffer);
    this.index = index;
  }

  lock() {
    while (true) {
      // Try to acquire lock
      if (Atomics.compareExchange(this.int32, this.index, 0, 1) === 0) {
        return; // Got the lock
      }

      // Lock is held, wait for notification
      Atomics.wait(this.int32, this.index, 1);
      // Another thread released the lock, try again
    }
  }

  unlock() {
    Atomics.store(this.int32, this.index, 0);
    // Wake up one waiting thread
    Atomics.notify(this.int32, this.index, 1);
  }
}

// Usage: Same as SpinLock but more CPU-friendly
const mutex = new Mutex(mutexBuffer);

mutex.lock();
try {
  // Critical section
} finally {
  mutex.unlock();
}
```

**Pros:** CPU-efficient, sleeps when waiting
**Cons:** Slightly more complex

### Pattern 3: Semaphore

Allows N concurrent accesses:

```javascript
class Semaphore {
  constructor(sharedBuffer, initialCount, index = 0) {
    this.int32 = new Int32Array(sharedBuffer);
    this.index = index;
    Atomics.store(this.int32, index, initialCount);
  }

  acquire() {
    while (true) {
      const current = Atomics.load(this.int32, this.index);

      if (current > 0) {
        // Try to decrement
        const prev = Atomics.compareExchange(
          this.int32,
          this.index,
          current,
          current - 1
        );

        if (prev === current) {
          return; // Acquired
        }
        // Retry if another thread changed it
      } else {
        // No permits available, wait
        Atomics.wait(this.int32, this.index, 0);
      }
    }
  }

  release() {
    Atomics.add(this.int32, this.index, 1);
    Atomics.notify(this.int32, this.index, 1);
  }
}

// Usage: Limit to 3 concurrent workers
const sem = new Semaphore(semBuffer, 3);

sem.acquire();
try {
  // At most 3 threads here at once
  await doExpensiveOperation();
} finally {
  sem.release();
}
```

### Pattern 4: Barrier

Synchronize multiple threads at a point:

```javascript
class Barrier {
  constructor(sharedBuffer, threadCount) {
    this.int32 = new Int32Array(sharedBuffer);
    this.threadCount = threadCount;
    // int32[0] = waiting count
    // int32[1] = generation
    Atomics.store(this.int32, 0, 0);
    Atomics.store(this.int32, 1, 0);
  }

  async wait() {
    const generation = Atomics.load(this.int32, 1);

    // Increment waiting count
    const waiting = Atomics.add(this.int32, 0, 1) + 1;

    if (waiting === this.threadCount) {
      // Last thread to arrive
      // Reset counter and increment generation
      Atomics.store(this.int32, 0, 0);
      Atomics.add(this.int32, 1, 1);

      // Wake all waiting threads
      Atomics.notify(this.int32, 1, this.threadCount);
    } else {
      // Wait for all threads to arrive
      while (Atomics.load(this.int32, 1) === generation) {
        Atomics.wait(this.int32, 1, generation);
      }
    }
  }
}

// Usage: All workers wait here until all arrive
const barrier = new Barrier(barrierBuffer, 4);

// Phase 1
doPhase1Work();

// Wait for all workers to finish phase 1
await barrier.wait();

// Phase 2 (all workers start together)
doPhase2Work();
```

### Pattern 5: Read-Write Lock

Multiple readers, single writer:

```javascript
class RWLock {
  constructor(sharedBuffer) {
    this.int32 = new Int32Array(sharedBuffer);
    // int32[0] = reader count (positive) or writer flag (negative)
    Atomics.store(this.int32, 0, 0);
  }

  readLock() {
    while (true) {
      const current = Atomics.load(this.int32, 0);

      // If writer is active (negative), wait
      if (current < 0) {
        Atomics.wait(this.int32, 0, current);
        continue;
      }

      // Try to increment reader count
      if (Atomics.compareExchange(this.int32, 0, current, current + 1) === current) {
        return; // Acquired read lock
      }
    }
  }

  readUnlock() {
    const readers = Atomics.sub(this.int32, 0, 1) - 1;

    // If last reader, wake writers
    if (readers === 0) {
      Atomics.notify(this.int32, 0);
    }
  }

  writeLock() {
    while (true) {
      // Try to set writer flag (0 -> -1)
      if (Atomics.compareExchange(this.int32, 0, 0, -1) === 0) {
        return; // Acquired write lock
      }

      // Wait for readers and writers to finish
      Atomics.wait(this.int32, 0, Atomics.load(this.int32, 0));
    }
  }

  writeUnlock() {
    Atomics.store(this.int32, 0, 0);
    Atomics.notify(this.int32, 0); // Wake all waiting threads
  }
}

// Usage
const rwlock = new RWLock(lockBuffer);

// Multiple readers can access concurrently
rwlock.readLock();
const data = readSharedData();
rwlock.readUnlock();

// Only one writer at a time
rwlock.writeLock();
writeSharedData(newData);
rwlock.writeUnlock();
```

## Real-World Example: Thread-Safe Queue

```javascript
class ConcurrentQueue {
  constructor(capacity = 100) {
    this.capacity = capacity;

    // Shared buffer layout:
    // [0] = head index
    // [1] = tail index
    // [2] = size
    // [3] = lock
    // [4...] = data
    const bufferSize = (4 + capacity) * 4; // 4 bytes per int32
    this.sab = new SharedArrayBuffer(bufferSize);
    this.int32 = new Int32Array(this.sab);

    this.mutex = new Mutex(this.sab, 3); // Use index 3 for lock
  }

  enqueue(value) {
    this.mutex.lock();
    try {
      const size = Atomics.load(this.int32, 2);

      if (size >= this.capacity) {
        throw new Error('Queue full');
      }

      const tail = Atomics.load(this.int32, 1);
      const dataIndex = 4 + tail;

      Atomics.store(this.int32, dataIndex, value);
      Atomics.store(this.int32, 1, (tail + 1) % this.capacity);
      Atomics.add(this.int32, 2, 1);

      // Notify waiting dequeuers
      Atomics.notify(this.int32, 2);

      return true;
    } finally {
      this.mutex.unlock();
    }
  }

  dequeue() {
    this.mutex.lock();
    try {
      while (true) {
        const size = Atomics.load(this.int32, 2);

        if (size === 0) {
          // Queue empty, wait for items
          this.mutex.unlock();
          Atomics.wait(this.int32, 2, 0);
          this.mutex.lock();
          continue;
        }

        const head = Atomics.load(this.int32, 0);
        const dataIndex = 4 + head;

        const value = Atomics.load(this.int32, dataIndex);
        Atomics.store(this.int32, 0, (head + 1) % this.capacity);
        Atomics.sub(this.int32, 2, 1);

        return value;
      }
    } finally {
      this.mutex.unlock();
    }
  }

  size() {
    return Atomics.load(this.int32, 2);
  }
}
```

## Best Practices

### 1. Always Use Finally for Unlocking

```javascript
// ✅ Good: Always unlocks
lock.lock();
try {
  // Critical section
} finally {
  lock.unlock();
}

// ❌ Bad: Might not unlock if exception thrown
lock.lock();
// Critical section
lock.unlock(); // Might not execute!
```

### 2. Minimize Critical Sections

```javascript
// ❌ Bad: Large critical section
lock.lock();
const data = fetchData();
const processed = processData(data);
const result = saveData(processed);
lock.unlock();

// ✅ Good: Only protect shared access
const data = fetchData();
const processed = processData(data);

lock.lock();
const result = saveData(processed);
lock.unlock();
```

### 3. Avoid Deadlocks

```javascript
// ❌ Bad: Can deadlock
// Thread 1:
lock1.lock();
lock2.lock();

// Thread 2:
lock2.lock(); // Waits for Thread 1
lock1.lock(); // Deadlock!

// ✅ Good: Always acquire locks in same order
function acquireLocks(lock1, lock2) {
  const [first, second] = lock1.index < lock2.index
    ? [lock1, lock2]
    : [lock2, lock1];

  first.lock();
  second.lock();
}
```

### 4. Use Higher-Level Abstractions

```javascript
// Prefer higher-level patterns over manual synchronization
// Instead of manual mutex management, use safe wrappers

class SafeCounter {
  constructor() {
    this.sab = new SharedArrayBuffer(8);
    this.value = new Int32Array(this.sab, 0, 1);
    this.lock = new Mutex(this.sab, 1);
  }

  increment() {
    this.lock.lock();
    try {
      return Atomics.add(this.value, 0, 1) + 1;
    } finally {
      this.lock.unlock();
    }
  }

  get() {
    return Atomics.load(this.value, 0);
  }
}
```

## Key Takeaways

1. **Atomics prevent race conditions** - Essential for shared memory
2. **Compare-and-swap is fundamental** - Base for lock-free structures
3. **Wait/notify for efficiency** - Avoids busy-waiting
4. **Multiple synchronization patterns** - Choose based on use case
5. **Always unlock in finally** - Prevents deadlocks
6. **Minimize critical sections** - Better performance
7. **Avoid nested locks** - Prevents deadlocks

## Next Steps

Learn about [memory management](./03-memory-management.md) for efficient shared memory usage.
