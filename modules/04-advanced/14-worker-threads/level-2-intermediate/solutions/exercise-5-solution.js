/**
 * Exercise 5 Solution: Debugging and Monitoring Workers
 *
 * This solution demonstrates:
 * - Comprehensive logging system with multiple log levels
 * - Worker health monitoring and status tracking
 * - Automatic crash recovery and worker recreation
 * - Task timeout detection and handling
 * - Detailed metrics and health reporting
 * - Retry logic for failed tasks
 * - Graceful degradation under failure conditions
 *
 * KEY CONCEPTS:
 * - Observability: Logging, metrics, and health checks
 * - Resilience: Crash recovery and retry mechanisms
 * - Monitoring: Real-time status tracking
 * - Production-Ready: Handles edge cases and failures
 * - Debugging: Structured logs for troubleshooting
 */

const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const { performance } = require('perf_hooks');

if (isMainThread) {
  console.log('=== Monitored Worker Pool Exercise ===\n');

  /**
   * Log Levels
   */
  const LogLevel = {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
    CRITICAL: 'CRITICAL'
  };

  /**
   * Worker Status
   */
  const WorkerStatus = {
    IDLE: 'idle',
    BUSY: 'busy',
    UNRESPONSIVE: 'unresponsive',
    CRASHED: 'crashed'
  };

  /**
   * MonitoredWorkerPool Class
   *
   * A production-ready worker pool with comprehensive monitoring,
   * health checks, and automatic recovery from failures.
   */
  class MonitoredWorkerPool {
    constructor(workerScript, poolSize = 4) {
      this.workerScript = workerScript;
      this.poolSize = poolSize;
      this.workers = [];
      this.taskQueue = [];
      this.nextTaskId = 0;
      this.nextWorkerId = 0;

      // Configuration
      this.taskTimeout = 5000; // 5 seconds
      this.healthCheckInterval = 2000; // 2 seconds
      this.maxRetries = 2;

      // Metrics
      this.metrics = {
        tasksTotal: 0,
        tasksCompleted: 0,
        tasksFailed: 0,
        tasksRetried: 0,
        tasksTimedOut: 0,
        workersCrashed: 0,
        workersRecreated: 0,
        totalTaskTime: 0
      };

      // Logs collection
      this.logs = [];

      // Initialize pool
      this.createPool();

      // Start health monitoring
      this.startHealthMonitoring();
    }

    /**
     * Structured logging with timestamp and context
     */
    log(level, message, data = {}) {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        level,
        message,
        data
      };

      this.logs.push(logEntry);

      // Format for console
      const color = {
        DEBUG: '\x1b[36m',    // Cyan
        INFO: '\x1b[32m',     // Green
        WARN: '\x1b[33m',     // Yellow
        ERROR: '\x1b[31m',    // Red
        CRITICAL: '\x1b[35m'  // Magenta
      }[level] || '';

      const reset = '\x1b[0m';
      const dataStr = Object.keys(data).length > 0 ? ` ${JSON.stringify(data)}` : '';

      console.log(`${color}[${level}]${reset} ${message}${dataStr}`);
    }

    /**
     * Creates the worker pool
     */
    createPool() {
      this.log(LogLevel.INFO, `Creating pool with ${this.poolSize} workers`);

      for (let i = 0; i < this.poolSize; i++) {
        this.createWorker();
      }
    }

    /**
     * Creates a single worker with monitoring setup
     */
    createWorker() {
      const workerId = this.nextWorkerId++;

      try {
        const worker = new Worker(this.workerScript, {
          workerData: { workerId }
        });

        const workerInfo = {
          id: workerId,
          worker,
          status: WorkerStatus.IDLE,
          currentTask: null,
          tasksCompleted: 0,
          lastActivity: Date.now(),
          pid: worker.threadId
        };

        // Handle messages from worker
        worker.on('message', (result) => {
          this.handleWorkerMessage(workerInfo, result);
        });

        // Handle worker errors
        worker.on('error', (error) => {
          this.handleWorkerError(workerInfo, error);
        });

        // Handle worker exit (crash)
        worker.on('exit', (code) => {
          if (code !== 0) {
            this.handleWorkerCrash(workerInfo, code);
          }
        });

        this.workers.push(workerInfo);

        this.log(LogLevel.INFO, `Worker created`, {
          workerId,
          threadId: worker.threadId
        });

      } catch (error) {
        this.log(LogLevel.ERROR, `Failed to create worker`, { error: error.message });
      }
    }

    /**
     * Execute a task with monitoring and timeout
     */
    async execute(task) {
      this.metrics.tasksTotal++;

      return new Promise((resolve, reject) => {
        const taskWrapper = {
          id: this.nextTaskId++,
          task,
          resolve,
          reject,
          startTime: performance.now(),
          retries: 0,
          timeoutHandle: null
        };

        this.log(LogLevel.INFO, `Task queued`, {
          taskId: taskWrapper.id,
          taskType: task.type
        });

        // Setup timeout
        taskWrapper.timeoutHandle = setTimeout(() => {
          this.handleTaskTimeout(taskWrapper);
        }, this.taskTimeout);

        // Try to assign to available worker
        const availableWorker = this.workers.find(
          w => w.status === WorkerStatus.IDLE
        );

        if (availableWorker) {
          this.assignTask(availableWorker, taskWrapper);
        } else {
          this.taskQueue.push(taskWrapper);
          this.log(LogLevel.DEBUG, `Task added to queue`, {
            taskId: taskWrapper.id,
            queueLength: this.taskQueue.length
          });
        }
      });
    }

    /**
     * Assigns a task to a worker
     */
    assignTask(workerInfo, taskWrapper) {
      workerInfo.status = WorkerStatus.BUSY;
      workerInfo.currentTask = taskWrapper;
      workerInfo.lastActivity = Date.now();

      this.log(LogLevel.INFO, `Task started`, {
        taskId: taskWrapper.id,
        workerId: workerInfo.id,
        taskType: taskWrapper.task.type
      });

      try {
        workerInfo.worker.postMessage(taskWrapper.task);
      } catch (error) {
        this.log(LogLevel.ERROR, `Failed to send task to worker`, {
          taskId: taskWrapper.id,
          workerId: workerInfo.id,
          error: error.message
        });

        this.handleTaskFailure(workerInfo, taskWrapper, error);
      }
    }

    /**
     * Handles successful task completion
     */
    handleWorkerMessage(workerInfo, result) {
      const taskWrapper = workerInfo.currentTask;

      if (!taskWrapper) {
        this.log(LogLevel.WARN, `Received message from idle worker`, {
          workerId: workerInfo.id
        });
        return;
      }

      // Clear timeout
      if (taskWrapper.timeoutHandle) {
        clearTimeout(taskWrapper.timeoutHandle);
      }

      const duration = performance.now() - taskWrapper.startTime;

      if (result.success) {
        // Task completed successfully
        this.metrics.tasksCompleted++;
        this.metrics.totalTaskTime += duration;
        workerInfo.tasksCompleted++;

        this.log(LogLevel.INFO, `Task completed`, {
          taskId: result.taskId,
          workerId: workerInfo.id,
          duration: `${duration.toFixed(2)}ms`
        });

        taskWrapper.resolve(result);

      } else {
        // Task failed with error
        this.log(LogLevel.ERROR, `Task failed`, {
          taskId: result.taskId,
          workerId: workerInfo.id,
          error: result.error
        });

        this.handleTaskFailure(workerInfo, taskWrapper, new Error(result.error));
      }

      // Mark worker as available
      workerInfo.status = WorkerStatus.IDLE;
      workerInfo.currentTask = null;
      workerInfo.lastActivity = Date.now();

      // Process next task
      this.processNextTask(workerInfo);
    }

    /**
     * Handles worker errors
     */
    handleWorkerError(workerInfo, error) {
      this.log(LogLevel.ERROR, `Worker error`, {
        workerId: workerInfo.id,
        error: error.message
      });

      if (workerInfo.currentTask) {
        this.handleTaskFailure(workerInfo, workerInfo.currentTask, error);
      }

      workerInfo.status = WorkerStatus.IDLE;
      workerInfo.currentTask = null;
    }

    /**
     * Handles task timeout
     */
    handleTaskTimeout(taskWrapper) {
      this.metrics.tasksTimedOut++;

      this.log(LogLevel.WARN, `Task timeout`, {
        taskId: taskWrapper.id,
        duration: `${(performance.now() - taskWrapper.startTime).toFixed(2)}ms`
      });

      // Find worker executing this task
      const workerInfo = this.workers.find(
        w => w.currentTask && w.currentTask.id === taskWrapper.id
      );

      if (workerInfo) {
        workerInfo.status = WorkerStatus.UNRESPONSIVE;

        this.log(LogLevel.WARN, `Worker marked as unresponsive`, {
          workerId: workerInfo.id
        });

        // Terminate and recreate worker
        this.recreateWorker(workerInfo);
      }

      // Retry task if possible
      if (taskWrapper.retries < this.maxRetries) {
        this.retryTask(taskWrapper);
      } else {
        taskWrapper.reject(new Error('Task timeout - max retries exceeded'));
      }
    }

    /**
     * Handles task failure
     */
    handleTaskFailure(workerInfo, taskWrapper, error) {
      this.metrics.tasksFailed++;

      // Clear timeout
      if (taskWrapper.timeoutHandle) {
        clearTimeout(taskWrapper.timeoutHandle);
      }

      // Retry if possible
      if (taskWrapper.retries < this.maxRetries) {
        this.retryTask(taskWrapper);
      } else {
        this.log(LogLevel.ERROR, `Task failed - max retries exceeded`, {
          taskId: taskWrapper.id
        });
        taskWrapper.reject(error);
      }

      // Mark worker as available
      workerInfo.status = WorkerStatus.IDLE;
      workerInfo.currentTask = null;

      // Process next task
      this.processNextTask(workerInfo);
    }

    /**
     * Retries a failed task
     */
    retryTask(taskWrapper) {
      this.metrics.tasksRetried++;
      taskWrapper.retries++;

      this.log(LogLevel.INFO, `Retrying task`, {
        taskId: taskWrapper.id,
        attempt: taskWrapper.retries + 1
      });

      // Reset timeout
      if (taskWrapper.timeoutHandle) {
        clearTimeout(taskWrapper.timeoutHandle);
      }

      taskWrapper.timeoutHandle = setTimeout(() => {
        this.handleTaskTimeout(taskWrapper);
      }, this.taskTimeout);

      // Add back to queue
      this.taskQueue.unshift(taskWrapper); // Add to front for priority

      // Try to process immediately
      const availableWorker = this.workers.find(
        w => w.status === WorkerStatus.IDLE
      );

      if (availableWorker) {
        const nextTask = this.taskQueue.shift();
        if (nextTask) {
          this.assignTask(availableWorker, nextTask);
        }
      }
    }

    /**
     * Handles worker crash
     */
    handleWorkerCrash(workerInfo, exitCode) {
      this.metrics.workersCrashed++;

      this.log(LogLevel.CRITICAL, `Worker crashed`, {
        workerId: workerInfo.id,
        exitCode
      });

      workerInfo.status = WorkerStatus.CRASHED;

      // Handle any pending task
      if (workerInfo.currentTask) {
        const taskWrapper = workerInfo.currentTask;

        if (taskWrapper.retries < this.maxRetries) {
          this.retryTask(taskWrapper);
        } else {
          taskWrapper.reject(new Error('Worker crashed'));
        }
      }

      // Recreate worker
      this.recreateWorker(workerInfo);
    }

    /**
     * Recreates a crashed or unresponsive worker
     */
    async recreateWorker(workerInfo) {
      this.log(LogLevel.INFO, `Recreating worker`, {
        workerId: workerInfo.id
      });

      // Terminate old worker
      try {
        await workerInfo.worker.terminate();
      } catch (error) {
        // Worker may already be dead
      }

      // Remove from pool
      const index = this.workers.indexOf(workerInfo);
      if (index > -1) {
        this.workers.splice(index, 1);
      }

      // Create new worker
      this.createWorker();
      this.metrics.workersRecreated++;

      // Process queued tasks
      const availableWorker = this.workers.find(
        w => w.status === WorkerStatus.IDLE
      );

      if (availableWorker && this.taskQueue.length > 0) {
        const nextTask = this.taskQueue.shift();
        this.assignTask(availableWorker, nextTask);
      }
    }

    /**
     * Processes next task from queue
     */
    processNextTask(workerInfo) {
      if (this.taskQueue.length > 0 && workerInfo.status === WorkerStatus.IDLE) {
        const nextTask = this.taskQueue.shift();
        this.assignTask(workerInfo, nextTask);
      }
    }

    /**
     * Health monitoring - runs periodically
     */
    monitorHealth() {
      const now = Date.now();

      this.workers.forEach(workerInfo => {
        if (workerInfo.status === WorkerStatus.BUSY) {
          const taskAge = now - workerInfo.lastActivity;

          if (taskAge > this.taskTimeout * 1.5) {
            this.log(LogLevel.WARN, `Worker potentially stuck`, {
              workerId: workerInfo.id,
              taskAge: `${taskAge}ms`,
              taskId: workerInfo.currentTask?.id
            });

            workerInfo.status = WorkerStatus.UNRESPONSIVE;
          }
        }
      });

      // Log pool status
      const idleCount = this.workers.filter(w => w.status === WorkerStatus.IDLE).length;
      const busyCount = this.workers.filter(w => w.status === WorkerStatus.BUSY).length;
      const unresponsiveCount = this.workers.filter(w => w.status === WorkerStatus.UNRESPONSIVE).length;

      if (this.taskQueue.length > 0 || unresponsiveCount > 0) {
        this.log(LogLevel.DEBUG, `Pool status`, {
          idle: idleCount,
          busy: busyCount,
          unresponsive: unresponsiveCount,
          queueLength: this.taskQueue.length
        });
      }
    }

    /**
     * Starts periodic health monitoring
     */
    startHealthMonitoring() {
      this.healthCheckTimer = setInterval(() => {
        this.monitorHealth();
      }, this.healthCheckInterval);

      this.log(LogLevel.INFO, `Health monitoring started`, {
        interval: `${this.healthCheckInterval}ms`
      });
    }

    /**
     * Returns comprehensive health report
     */
    getHealthReport() {
      const avgTaskTime = this.metrics.tasksCompleted > 0
        ? this.metrics.totalTaskTime / this.metrics.tasksCompleted
        : 0;

      return {
        pool: {
          size: this.poolSize,
          healthy: this.workers.filter(w => w.status === WorkerStatus.IDLE || w.status === WorkerStatus.BUSY).length,
          idle: this.workers.filter(w => w.status === WorkerStatus.IDLE).length,
          busy: this.workers.filter(w => w.status === WorkerStatus.BUSY).length,
          unresponsive: this.workers.filter(w => w.status === WorkerStatus.UNRESPONSIVE).length,
          crashed: this.workers.filter(w => w.status === WorkerStatus.CRASHED).length
        },
        tasks: {
          total: this.metrics.tasksTotal,
          completed: this.metrics.tasksCompleted,
          failed: this.metrics.tasksFailed,
          timedOut: this.metrics.tasksTimedOut,
          retried: this.metrics.tasksRetried,
          queued: this.taskQueue.length,
          avgTime: `${avgTaskTime.toFixed(2)}ms`
        },
        workers: {
          crashed: this.metrics.workersCrashed,
          recreated: this.metrics.workersRecreated
        },
        workerDetails: this.workers.map(w => ({
          id: w.id,
          status: w.status,
          tasksCompleted: w.tasksCompleted,
          currentTask: w.currentTask?.id || null
        }))
      };
    }

    /**
     * Gracefully terminates the pool
     */
    async terminate() {
      this.log(LogLevel.INFO, 'Terminating pool');

      // Stop health monitoring
      if (this.healthCheckTimer) {
        clearInterval(this.healthCheckTimer);
      }

      // Wait for active tasks
      while (this.workers.some(w => w.status === WorkerStatus.BUSY)) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Terminate all workers
      await Promise.all(
        this.workers.map(w => w.worker.terminate())
      );

      this.log(LogLevel.INFO, 'Pool terminated');
    }
  }

  // Test tasks with different outcomes
  const tasks = [
    { id: 1, type: 'fibonacci', n: 35 },           // Success
    { id: 2, type: 'fibonacci', n: 36 },           // Success
    { id: 3, type: 'divide', a: 10, b: 2 },        // Success
    { id: 4, type: 'divide', a: 10, b: 0 },        // Error: division by zero
    { id: 5, type: 'fibonacci', n: 37 },           // Success
    { id: 6, type: 'hang' },                       // Timeout (hang)
    { id: 7, type: 'crash' },                      // Crash worker
    { id: 8, type: 'fibonacci', n: 35 },           // Success (after recovery)
    { id: 9, type: 'parse', data: '{invalid}' },   // Error: invalid JSON
    { id: 10, type: 'fibonacci', n: 36 }           // Success
  ];

  async function test() {
    const pool = new MonitoredWorkerPool(__filename, 4);

    console.log('\nRunning tasks with monitoring...\n');

    // Run all tasks
    const results = await Promise.allSettled(
      tasks.map(task => pool.execute(task))
    );

    console.log('\n=== Task Results ===\n');

    results.forEach((result, index) => {
      const task = tasks[index];
      if (result.status === 'fulfilled') {
        console.log(`✓ Task ${task.id} (${task.type}): Success`);
      } else {
        console.log(`✗ Task ${task.id} (${task.type}): ${result.reason.message}`);
      }
    });

    // Display health report
    console.log('\n=== Health Report ===');
    const report = pool.getHealthReport();
    console.log(JSON.stringify(report, null, 2));

    await pool.terminate();
  }

  test().catch(console.error);

} else {
  /**
   * Worker Thread Code
   *
   * Executes different task types with various outcomes
   */
  const workerId = workerData.workerId;

  parentPort.on('message', (task) => {
    try {
      let result;

      switch (task.type) {
        case 'fibonacci':
          function fibonacci(n) {
            if (n <= 1) return n;
            return fibonacci(n - 1) + fibonacci(n - 2);
          }
          result = fibonacci(task.n);
          break;

        case 'divide':
          if (task.b === 0) throw new Error('Division by zero');
          result = task.a / task.b;
          break;

        case 'parse':
          result = JSON.parse(task.data);
          break;

        case 'hang':
          // Simulate hanging worker (infinite loop)
          while (true) {
            // This will cause a timeout
          }
          break;

        case 'crash':
          // Simulate worker crash
          process.exit(1);
          break;

        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      parentPort.postMessage({
        taskId: task.id,
        success: true,
        result
      });

    } catch (error) {
      parentPort.postMessage({
        taskId: task.id,
        success: false,
        error: error.message
      });
    }
  });
}

/**
 * LEARNING NOTES:
 *
 * 1. STRUCTURED LOGGING:
 *
 *    Benefits:
 *    - Consistent format across all logs
 *    - Easy to parse and analyze
 *    - Includes context and metadata
 *    - Supports different log levels
 *    - Enables log aggregation
 *
 *    Log Levels:
 *    DEBUG - Detailed diagnostic info
 *    INFO - General informational messages
 *    WARN - Warning messages (potential issues)
 *    ERROR - Error messages (task failures)
 *    CRITICAL - Critical issues (worker crashes)
 *
 * 2. HEALTH MONITORING:
 *
 *    What to Monitor:
 *    - Worker status (idle, busy, unresponsive)
 *    - Task execution time
 *    - Queue depth
 *    - Error rates
 *    - Worker crashes
 *    - Memory usage
 *
 *    Health Checks:
 *    - Periodic status checks
 *    - Timeout detection
 *    - Unresponsive worker detection
 *    - Resource usage monitoring
 *
 * 3. CRASH RECOVERY:
 *
 *    Recovery Strategies:
 *    - Automatic worker recreation
 *    - Task retry with backoff
 *    - Graceful degradation
 *    - Circuit breaker pattern
 *
 *    Best Practices:
 *    - Limit retry attempts
 *    - Track failure patterns
 *    - Alert on repeated failures
 *    - Maintain pool health
 *
 * 4. TIMEOUT HANDLING:
 *
 *    Why Timeouts Matter:
 *    - Prevent hanging workers
 *    - Detect infinite loops
 *    - Maintain system responsiveness
 *    - Resource leak prevention
 *
 *    Implementation:
 *    - Per-task timeout timer
 *    - Clear timeout on completion
 *    - Mark worker as unresponsive
 *    - Terminate and recreate worker
 *
 * 5. METRICS COLLECTION:
 *
 *    Key Metrics:
 *    - Task completion rate
 *    - Error rate
 *    - Average task time
 *    - Worker crashes
 *    - Queue depth
 *    - Retry count
 *
 *    Uses:
 *    - Performance optimization
 *    - Capacity planning
 *    - Alerting thresholds
 *    - Trend analysis
 *
 * 6. PRODUCTION CONSIDERATIONS:
 *
 *    ✓ Comprehensive error handling
 *    ✓ Automatic recovery
 *    ✓ Monitoring and observability
 *    ✓ Graceful degradation
 *    ✓ Resource cleanup
 *    ✓ Configurable timeouts
 *    ✓ Structured logging
 *
 * BONUS: CIRCUIT BREAKER PATTERN
 *
 * class CircuitBreaker {
 *   constructor(threshold = 5, timeout = 60000) {
 *     this.failureCount = 0;
 *     this.threshold = threshold;
 *     this.timeout = timeout;
 *     this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
 *     this.nextAttempt = Date.now();
 *   }
 *
 *   async execute(fn) {
 *     if (this.state === 'OPEN') {
 *       if (Date.now() < this.nextAttempt) {
 *         throw new Error('Circuit breaker is OPEN');
 *       }
 *       this.state = 'HALF_OPEN';
 *     }
 *
 *     try {
 *       const result = await fn();
 *       this.onSuccess();
 *       return result;
 *     } catch (error) {
 *       this.onFailure();
 *       throw error;
 *     }
 *   }
 *
 *   onSuccess() {
 *     this.failureCount = 0;
 *     this.state = 'CLOSED';
 *   }
 *
 *   onFailure() {
 *     this.failureCount++;
 *     if (this.failureCount >= this.threshold) {
 *       this.state = 'OPEN';
 *       this.nextAttempt = Date.now() + this.timeout;
 *     }
 *   }
 * }
 *
 * BONUS: METRICS EXPORT
 *
 * // Prometheus-style metrics
 * function exportMetrics(pool) {
 *   const report = pool.getHealthReport();
 *
 *   return `
 * # HELP worker_pool_size Number of workers in pool
 * # TYPE worker_pool_size gauge
 * worker_pool_size ${report.pool.size}
 *
 * # HELP tasks_completed_total Total number of completed tasks
 * # TYPE tasks_completed_total counter
 * tasks_completed_total ${report.tasks.completed}
 *
 * # HELP tasks_failed_total Total number of failed tasks
 * # TYPE tasks_failed_total counter
 * tasks_failed_total ${report.tasks.failed}
 *   `.trim();
 * }
 */
