/**
 * Solution 5: Debugging and Monitoring Workers
 *
 * This solution demonstrates:
 * - Comprehensive logging system
 * - Worker health monitoring
 * - Crash detection and recovery
 * - Timeout handling
 * - Performance metrics
 */

const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const { performance } = require('perf_hooks');

if (isMainThread) {
  console.log('=== Monitored Worker Pool ===\n');

  class MonitoredWorkerPool {
    constructor(workerScript, poolSize = 4) {
      this.workerScript = workerScript;
      this.poolSize = poolSize;
      this.workers = new Map();
      this.availableWorkers = [];
      this.queue = [];
      this.nextWorkerId = 1;
      this.taskTimeout = 5000; // 5 seconds

      // Statistics
      this.stats = {
        tasksCompleted: 0,
        tasksFailed: 0,
        tasksRetried: 0,
        workersCrashed: 0,
        totalTaskTime: 0,
        tasksByStatus: new Map()
      };

      // Create initial workers
      for (let i = 0; i < poolSize; i++) {
        this.createWorker();
      }

      // Start health monitoring
      this.healthCheckInterval = setInterval(() => {
        this.monitorHealth();
      }, 2000);

      this.log('INFO', `Pool created with ${poolSize} workers`);
    }

    log(level, message, data = {}) {
      const timestamp = new Date().toISOString();
      const dataStr = Object.keys(data).length > 0
        ? ` | ${JSON.stringify(data)}`
        : '';

      const levelColors = {
        INFO: '\x1b[32m',      // Green
        WARN: '\x1b[33m',      // Yellow
        ERROR: '\x1b[31m',     // Red
        CRITICAL: '\x1b[35m',  // Magenta
        DEBUG: '\x1b[36m'      // Cyan
      };

      const color = levelColors[level] || '';
      const reset = '\x1b[0m';

      console.log(`${color}[${level}]${reset} ${timestamp} - ${message}${dataStr}`);
    }

    createWorker() {
      const workerId = this.nextWorkerId++;

      const worker = new Worker(this.workerScript, {
        workerData: { workerId }
      });

      const workerInfo = {
        id: workerId,
        worker,
        status: 'idle',
        currentTask: null,
        tasksCompleted: 0,
        tasksFailed: 0,
        createdAt: Date.now(),
        lastActivity: Date.now()
      };

      this.workers.set(workerId, workerInfo);
      this.availableWorkers.push(workerId);

      // Handle messages
      worker.on('message', (result) => {
        this.handleTaskComplete(workerId, result);
      });

      // Handle errors
      worker.on('error', (error) => {
        this.log('ERROR', `Worker ${workerId} error`, {
          error: error.message,
          workerId
        });

        const task = workerInfo.currentTask;
        if (task) {
          this.handleTaskFailure(workerId, task, error.message);
        }
      });

      // Handle exit
      worker.on('exit', (code) => {
        if (code !== 0) {
          this.log('CRITICAL', `Worker ${workerId} crashed`, {
            exitCode: code,
            workerId
          });

          this.handleWorkerCrash(workerId);
        } else {
          this.log('INFO', `Worker ${workerId} exited gracefully`, { workerId });
        }
      });

      this.log('INFO', `Worker ${workerId} created`, {
        workerId,
        pid: worker.threadId
      });

      return workerId;
    }

    async execute(task) {
      return new Promise((resolve, reject) => {
        const enrichedTask = {
          ...task,
          startTime: Date.now(),
          resolve,
          reject,
          retries: 0,
          maxRetries: 2
        };

        this.stats.tasksByStatus.set(task.id, 'queued');
        this.log('INFO', `Task ${task.id} queued`, {
          taskId: task.id,
          type: task.type
        });

        if (this.availableWorkers.length > 0) {
          this.runTask(enrichedTask);
        } else {
          this.queue.push(enrichedTask);
        }
      });
    }

    runTask(task) {
      const workerId = this.availableWorkers.shift();
      const workerInfo = this.workers.get(workerId);

      if (!workerInfo) {
        this.log('ERROR', `Worker ${workerId} not found`);
        this.queue.unshift(task);
        return;
      }

      workerInfo.status = 'busy';
      workerInfo.currentTask = task;
      workerInfo.lastActivity = Date.now();

      this.stats.tasksByStatus.set(task.id, 'running');

      this.log('INFO', `Task ${task.id} started on Worker ${workerId}`, {
        taskId: task.id,
        workerId
      });

      // Setup timeout
      task.timeoutId = setTimeout(() => {
        this.handleTaskTimeout(workerId, task);
      }, this.taskTimeout);

      // Send task to worker
      workerInfo.worker.postMessage(task);
    }

    handleTaskComplete(workerId, result) {
      const workerInfo = this.workers.get(workerId);
      if (!workerInfo) return;

      const task = workerInfo.currentTask;
      if (!task) return;

      clearTimeout(task.timeoutId);

      const duration = Date.now() - task.startTime;

      if (result.success) {
        this.stats.tasksCompleted++;
        this.stats.totalTaskTime += duration;
        workerInfo.tasksCompleted++;

        this.stats.tasksByStatus.set(task.id, 'completed');

        this.log('INFO', `Task ${task.id} completed`, {
          taskId: task.id,
          workerId,
          duration: `${duration}ms`
        });

        task.resolve(result.result);
      } else {
        this.handleTaskFailure(workerId, task, result.error);
      }

      // Make worker available
      workerInfo.status = 'idle';
      workerInfo.currentTask = null;
      workerInfo.lastActivity = Date.now();
      this.availableWorkers.push(workerId);

      // Process next task
      this.processQueue();
    }

    handleTaskFailure(workerId, task, error) {
      const workerInfo = this.workers.get(workerId);

      clearTimeout(task.timeoutId);

      this.stats.tasksFailed++;
      if (workerInfo) {
        workerInfo.tasksFailed++;
      }

      this.log('ERROR', `Task ${task.id} failed`, {
        taskId: task.id,
        workerId,
        error
      });

      // Retry logic
      if (task.retries < task.maxRetries) {
        task.retries++;
        this.stats.tasksRetried++;

        this.log('INFO', `Retrying task ${task.id} (attempt ${task.retries + 1})`, {
          taskId: task.id
        });

        this.queue.unshift(task);
      } else {
        this.stats.tasksByStatus.set(task.id, 'failed');
        task.reject(new Error(error));
      }
    }

    handleTaskTimeout(workerId, task) {
      this.log('WARN', `Task ${task.id} timeout on Worker ${workerId}`, {
        taskId: task.id,
        workerId,
        timeout: `${this.taskTimeout}ms`
      });

      // Terminate unresponsive worker
      const workerInfo = this.workers.get(workerId);
      if (workerInfo) {
        this.log('INFO', `Terminating unresponsive Worker ${workerId}`);
        workerInfo.worker.terminate();
        this.handleWorkerCrash(workerId);
      }

      // Retry task
      this.handleTaskFailure(workerId, task, 'Task timeout');
    }

    handleWorkerCrash(workerId) {
      this.stats.workersCrashed++;

      const workerInfo = this.workers.get(workerId);
      if (!workerInfo) return;

      // Handle current task
      const task = workerInfo.currentTask;
      if (task) {
        clearTimeout(task.timeoutId);
        this.handleTaskFailure(workerId, task, 'Worker crashed');
      }

      // Remove crashed worker
      this.workers.delete(workerId);
      const index = this.availableWorkers.indexOf(workerId);
      if (index > -1) {
        this.availableWorkers.splice(index, 1);
      }

      // Create replacement worker
      this.log('INFO', `Creating replacement worker for crashed Worker ${workerId}`);
      this.createWorker();
    }

    monitorHealth() {
      const now = Date.now();

      for (const [workerId, workerInfo] of this.workers.entries()) {
        if (workerInfo.status === 'busy') {
          const taskDuration = now - workerInfo.lastActivity;

          if (taskDuration > this.taskTimeout * 0.8) {
            this.log('WARN', `Worker ${workerId} approaching timeout`, {
              workerId,
              duration: `${taskDuration}ms`,
              taskId: workerInfo.currentTask?.id
            });
          }
        }
      }
    }

    processQueue() {
      if (this.queue.length > 0 && this.availableWorkers.length > 0) {
        const task = this.queue.shift();
        this.runTask(task);
      }
    }

    getHealthReport() {
      const avgTaskTime = this.stats.tasksCompleted > 0
        ? this.stats.totalTaskTime / this.stats.tasksCompleted
        : 0;

      const totalTasks = this.stats.tasksCompleted + this.stats.tasksFailed;
      const successRate = totalTasks > 0
        ? (this.stats.tasksCompleted / totalTasks) * 100
        : 0;

      return {
        totalTasks,
        completed: this.stats.tasksCompleted,
        failed: this.stats.tasksFailed,
        retried: this.stats.tasksRetried,
        successRate: `${successRate.toFixed(1)}%`,
        workersCrashed: this.stats.workersCrashed,
        avgTaskTime: `${avgTaskTime.toFixed(0)}ms`,
        queueSize: this.queue.length,
        activeWorkers: this.workers.size,
        availableWorkers: this.availableWorkers.length
      };
    }

    async terminate() {
      clearInterval(this.healthCheckInterval);

      this.log('INFO', 'Terminating worker pool');

      const terminatePromises = Array.from(this.workers.values()).map(
        workerInfo => workerInfo.worker.terminate()
      );

      await Promise.all(terminatePromises);

      this.log('INFO', 'Worker pool terminated');
    }
  }

  // Test tasks
  const tasks = [
    { id: 1, type: 'fibonacci', n: 35 },
    { id: 2, type: 'fibonacci', n: 36 },
    { id: 3, type: 'divide', a: 10, b: 2 },
    { id: 4, type: 'divide', a: 10, b: 0 },        // Will error
    { id: 5, type: 'fibonacci', n: 37 },
    { id: 6, type: 'hang' },                       // Will timeout
    { id: 7, type: 'crash' },                      // Will crash worker
    { id: 8, type: 'fibonacci', n: 35 },           // Should succeed after recovery
    { id: 9, type: 'parse', data: '{invalid}' },   // Will error
    { id: 10, type: 'fibonacci', n: 36 }
  ];

  async function test() {
    const pool = new MonitoredWorkerPool(__filename, 4);

    console.log('\nRunning monitored tasks...\n');

    // Run all tasks
    const results = await Promise.allSettled(
      tasks.map(task => pool.execute(task))
    );

    // Display results summary
    console.log('\n' + '='.repeat(70));
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
    console.log('\n' + '='.repeat(70));
    console.log('\n=== Health Report ===\n');

    const report = pool.getHealthReport();
    Object.entries(report).forEach(([key, value]) => {
      const label = key.replace(/([A-Z])/g, ' $1').trim();
      console.log(`${label}: ${value}`);
    });

    await pool.terminate();
  }

  test().catch(console.error);

} else {
  // === WORKER THREAD CODE ===
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
          // Simulate hanging worker (will timeout)
          while (true) {
            // Infinite loop
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
 * KEY FEATURES IMPLEMENTED:
 *
 * 1. Structured Logging:
 *    - Color-coded log levels
 *    - Timestamps and context data
 *    - Easily parseable format
 *
 * 2. Health Monitoring:
 *    - Periodic health checks
 *    - Timeout detection
 *    - Worker status tracking
 *
 * 3. Crash Recovery:
 *    - Automatic worker recreation
 *    - Task retry logic
 *    - Graceful degradation
 *
 * 4. Comprehensive Metrics:
 *    - Task statistics
 *    - Success/failure rates
 *    - Performance metrics
 *
 * PRODUCTION ENHANCEMENTS:
 *
 * 1. Structured logging to file:
 *    const winston = require('winston');
 *    this.logger = winston.createLogger({...});
 *
 * 2. Metrics export:
 *    const prom = require('prom-client');
 *    // Export to Prometheus/Grafana
 *
 * 3. Alerting:
 *    if (this.stats.workersCrashed > 3) {
 *      this.sendAlert('High crash rate detected');
 *    }
 *
 * 4. Circuit breaker:
 *    if (failureRate > 50%) {
 *      this.openCircuit(); // Stop accepting tasks
 *    }
 */
