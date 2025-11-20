/**
 * Exercise 2 Solution: Fork Specific Number of Workers
 *
 * This solution demonstrates:
 * - Dynamically determining system resources (CPU count)
 * - Scaling workers based on available hardware
 * - Tracking and managing multiple workers
 * - Gathering system information
 *
 * Key Concepts Explained:
 * - os.cpus(): Returns array of CPU cores with information
 * - os.platform(): Returns operating system platform
 * - os.arch(): Returns CPU architecture
 * - Dynamic worker creation based on system resources
 */

const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
  // === MASTER PROCESS ===

  // Get the number of CPU cores available on this system
  // This is the recommended number of workers for CPU-intensive tasks
  const numCPUs = os.cpus().length;

  // Display system information
  console.log('=== System Information ===');
  console.log(`CPUs: ${numCPUs}`);
  console.log(`Platform: ${os.platform()}`);
  console.log(`Architecture: ${os.arch()}`);
  console.log('');

  /*
   * Platform Examples:
   * - 'linux' on Linux
   * - 'darwin' on macOS
   * - 'win32' on Windows
   *
   * Architecture Examples:
   * - 'x64' for 64-bit
   * - 'arm' for ARM processors
   * - 'ia32' for 32-bit Intel
   */

  // Array to keep track of all worker references
  // This is useful for managing workers later (sending messages, etc.)
  const workers = [];

  console.log('=== Creating Workers ===');

  // Fork one worker per CPU core
  // This maximizes CPU utilization for parallel tasks
  for (let i = 0; i < numCPUs; i++) {
    const worker = cluster.fork();

    // Store worker reference for later use
    workers.push(worker);

    // Log worker creation with details
    console.log(`Created worker ${worker.id}, PID: ${worker.process.pid}`);
  }

  /*
   * Why match CPU count?
   * - Each worker can utilize one CPU core
   * - More workers than cores = context switching overhead
   * - Fewer workers than cores = underutilized CPU
   * - For I/O-bound tasks, you might use more workers
   * - For CPU-bound tasks, match or slightly exceed CPU count
   */

  console.log('');
  console.log('=== Cluster Summary ===');
  console.log(`Total workers: ${workers.length}`);

  // Extract and display all worker IDs
  const workerIds = workers.map(w => w.id);
  console.log(`Worker IDs: ${workerIds.join(', ')}`);

  /*
   * Additional information about workers
   * You can access various properties:
   * - worker.id: Unique cluster ID
   * - worker.process.pid: OS process ID
   * - worker.process.connected: IPC connection status
   * - worker.isDead(): Check if worker is dead
   */

  // Optional: Display detailed worker information
  console.log('');
  console.log('=== Worker Details ===');
  workers.forEach(worker => {
    console.log(`Worker ${worker.id}:`);
    console.log(`  PID: ${worker.process.pid}`);
    console.log(`  Connected: ${worker.process.connected}`);
  });

} else {
  // === WORKER PROCESS ===

  // Workers log when they start
  // In a real application, this is where workers would:
  // - Set up HTTP servers
  // - Connect to databases
  // - Initialize their work environment
  console.log(`Worker ${cluster.worker.id} started with PID: ${process.pid}`);

  /*
   * Worker Best Practices:
   * - Keep workers stateless when possible
   * - Don't share state between workers (use Redis, database, etc.)
   * - Each worker should be independent
   * - Workers should handle errors gracefully
   */
}

/**
 * BONUS CHALLENGE SOLUTIONS
 */

/*
// Bonus 1: Calculate and log memory information

const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
  const numCPUs = os.cpus().length;
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const memoryPerWorker = Math.floor(totalMemory / numCPUs);

  console.log('=== System Information ===');
  console.log(`CPUs: ${numCPUs}`);
  console.log(`Platform: ${os.platform()}`);
  console.log(`Architecture: ${os.arch()}`);
  console.log(`Total Memory: ${(totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB`);
  console.log(`Free Memory: ${(freeMemory / 1024 / 1024 / 1024).toFixed(2)} GB`);
  console.log(`Memory per Worker: ${(memoryPerWorker / 1024 / 1024).toFixed(2)} MB`);
  console.log('');

  const workers = [];

  console.log('=== Creating Workers ===');
  for (let i = 0; i < numCPUs; i++) {
    const worker = cluster.fork();
    workers.push(worker);
    console.log(`Created worker ${worker.id}, PID: ${worker.process.pid}`);
  }

  console.log('');
  console.log('=== Cluster Summary ===');
  console.log(`Total workers: ${workers.length}`);
  console.log(`Worker IDs: ${workers.map(w => w.id).join(', ')}`);

} else {
  console.log(`Worker ${cluster.worker.id} started with PID: ${process.pid}`);
}
*/

/*
// Bonus 2: Real-time worker status display

const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
  const numCPUs = os.cpus().length;
  const workers = [];

  console.log('=== System Information ===');
  console.log(`CPUs: ${numCPUs}`);
  console.log('');

  for (let i = 0; i < numCPUs; i++) {
    const worker = cluster.fork();
    workers.push(worker);
    console.log(`Created worker ${worker.id}, PID: ${worker.process.pid}`);
  }

  // Display real-time status every 5 seconds
  setInterval(() => {
    console.log('\n=== Worker Status (Live) ===');
    console.log(`Time: ${new Date().toLocaleTimeString()}`);

    workers.forEach(worker => {
      const status = worker.isDead() ? 'DEAD' : 'ALIVE';
      const connected = worker.process.connected ? 'CONNECTED' : 'DISCONNECTED';
      console.log(`Worker ${worker.id}: ${status}, ${connected}, PID: ${worker.process.pid}`);
    });
  }, 5000);

} else {
  console.log(`Worker ${cluster.worker.id} started`);
}
*/

/*
// Bonus 3: Environment variable override

const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
  // Allow overriding CPU count via environment variable
  // Usage: NUM_WORKERS=2 node exercise-2-solution.js
  const numCPUs = os.cpus().length;
  const numWorkers = parseInt(process.env.NUM_WORKERS) || numCPUs;

  console.log('=== System Information ===');
  console.log(`CPUs detected: ${numCPUs}`);
  console.log(`Workers to create: ${numWorkers}`);
  console.log(`Platform: ${os.platform()}`);
  console.log(`Architecture: ${os.arch()}`);
  console.log('');

  if (numWorkers !== numCPUs) {
    console.log(`⚠ Warning: Creating ${numWorkers} workers on ${numCPUs} CPUs`);
    if (numWorkers > numCPUs) {
      console.log('  More workers than CPUs may cause context switching overhead');
    } else {
      console.log('  Fewer workers than CPUs means underutilized CPU capacity');
    }
    console.log('');
  }

  const workers = [];

  console.log('=== Creating Workers ===');
  for (let i = 0; i < numWorkers; i++) {
    const worker = cluster.fork();
    workers.push(worker);
    console.log(`Created worker ${worker.id}, PID: ${worker.process.pid}`);
  }

  console.log('');
  console.log('=== Cluster Summary ===');
  console.log(`Total workers: ${workers.length}`);
  console.log(`Worker IDs: ${workers.map(w => w.id).join(', ')}`);

} else {
  console.log(`Worker ${cluster.worker.id} started with PID: ${process.pid}`);
}
*/

/**
 * LEARNING POINTS
 *
 * 1. CPU Count and Worker Scaling:
 *    - Use os.cpus().length to get CPU core count
 *    - For CPU-intensive tasks: workers = CPU count
 *    - For I/O-intensive tasks: can use more workers than CPUs
 *    - Consider leaving 1 CPU for the OS and other processes
 *
 * 2. System Information:
 *    - os.platform(): Useful for platform-specific logic
 *    - os.arch(): Important for architecture-specific operations
 *    - os.totalmem() / os.freemem(): Monitor memory constraints
 *    - os.loadavg(): Check system load (Unix-like systems only)
 *
 * 3. Worker Management:
 *    - Store worker references in an array or Map
 *    - Enables sending messages, monitoring status, graceful shutdown
 *    - Track worker metadata (creation time, restart count, etc.)
 *
 * 4. Resource Considerations:
 *    - Each worker consumes memory (Node.js process overhead)
 *    - Typical Node.js process: 10-30 MB base memory
 *    - Your application memory on top of that
 *    - Monitor total memory usage vs available memory
 *
 * 5. Production Considerations:
 *    - Don't blindly match CPU count
 *    - Consider your application's characteristics
 *    - Monitor performance and adjust
 *    - Some servers benefit from numCPUs - 1 (leave CPU for OS)
 *    - Load balancers like PM2 handle this automatically
 */

/**
 * BEST PRACTICES
 *
 * 1. Worker Count Strategy:
 *    ✅ CPU-bound tasks: Match CPU count
 *    ✅ I/O-bound tasks: Can exceed CPU count (1.5x or 2x)
 *    ✅ Mixed workloads: Start with CPU count, measure, adjust
 *    ✅ Consider using PM2 or similar for automatic management
 *
 * 2. Monitoring:
 *    ✅ Track worker creation and lifecycle
 *    ✅ Log system resources
 *    ✅ Monitor memory usage per worker
 *    ✅ Implement health checks
 *
 * 3. Flexibility:
 *    ✅ Make worker count configurable
 *    ✅ Support environment variables
 *    ✅ Allow runtime adjustment
 *    ✅ Document recommended settings
 *
 * 4. Resource Limits:
 *    ✅ Set memory limits per worker (--max-old-space-size)
 *    ✅ Monitor and restart workers approaching limits
 *    ✅ Implement graceful degradation
 *    ✅ Have fallback for resource constraints
 */

/**
 * COMMON PATTERNS
 *
 * 1. Conservative Approach:
 *    const numWorkers = Math.max(1, os.cpus().length - 1);
 *    // Leaves one CPU for system
 *
 * 2. Aggressive Approach:
 *    const numWorkers = os.cpus().length * 2;
 *    // For I/O-heavy applications
 *
 * 3. Configurable Approach:
 *    const numWorkers = process.env.WEB_CONCURRENCY || os.cpus().length;
 *    // Heroku and other platforms use WEB_CONCURRENCY
 *
 * 4. Adaptive Approach:
 *    // Start with fewer workers, scale up based on load
 *    // Requires more complex implementation
 */
