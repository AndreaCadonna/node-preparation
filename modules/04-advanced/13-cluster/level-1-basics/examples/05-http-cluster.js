/**
 * Example 5: Clustered HTTP Server
 *
 * This example demonstrates the most common use case for clustering:
 * creating a web server that uses all available CPU cores.
 *
 * Key concepts:
 * - Clustering HTTP servers
 * - Shared ports
 * - Load distribution
 * - Scalability
 *
 * Run this: node 05-http-cluster.js
 * Test: curl http://localhost:8000 (multiple times)
 */

const cluster = require('cluster');
const http = require('http');
const os = require('os');

const PORT = 8000;
const NUM_WORKERS = os.cpus().length;

if (cluster.isMaster) {
  console.log('=== CLUSTERED HTTP SERVER ===\n');
  console.log(`Master PID: ${process.pid}`);
  console.log(`System CPUs: ${NUM_WORKERS}`);
  console.log(`Creating ${NUM_WORKERS} workers...\n`);

  // Track request counts per worker
  const requestCounts = {};

  /**
   * Fork workers equal to CPU count
   * Each worker will run the HTTP server
   */
  for (let i = 0; i < NUM_WORKERS; i++) {
    const worker = cluster.fork();
    requestCounts[worker.id] = 0;

    console.log(`✓ Worker ${worker.id} created (PID ${worker.process.pid})`);
  }

  /**
   * Handle 'listening' event
   * Fired when each worker starts listening
   */
  cluster.on('listening', (worker, address) => {
    console.log(`✓ Worker ${worker.id} is listening on port ${address.port}`);
  });

  /**
   * Collect metrics from workers
   */
  cluster.on('message', (worker, message) => {
    if (message.type === 'request_handled') {
      requestCounts[worker.id]++;
    }
  });

  /**
   * Restart workers that crash
   */
  cluster.on('exit', (worker, code, signal) => {
    console.log(`\n⚠️  Worker ${worker.id} died (code: ${code})`);
    console.log('Restarting worker...');

    const newWorker = cluster.fork();
    requestCounts[newWorker.id] = 0;
  });

  /**
   * Display load distribution stats
   */
  setInterval(() => {
    console.log('\n=== REQUEST DISTRIBUTION ===');
    let total = 0;

    for (const id in requestCounts) {
      const count = requestCounts[id];
      total += count;
      console.log(`Worker ${id}: ${count} requests`);
    }

    console.log(`Total: ${total} requests`);
    console.log('===========================\n');
  }, 10000);

  console.log(`\n✓ Cluster is ready!`);
  console.log(`\nServer running at http://localhost:${PORT}`);
  console.log('Test with: curl http://localhost:8000\n');
  console.log('Notice: Each request is handled by a different worker (load balancing)\n');

} else {
  /**
   * Worker process - Create HTTP server
   *
   * IMPORTANT: All workers listen on the SAME port (8000)
   * This works because the master process actually owns the port
   * and distributes connections to workers
   */

  const server = http.createServer((req, res) => {
    // Log which worker is handling this request
    console.log(`  Worker ${cluster.worker.id} handling request from ${req.socket.remoteAddress}`);

    // Simulate some processing time
    const processingTime = Math.random() * 100;

    setTimeout(() => {
      // Send response
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(`Hello from worker ${cluster.worker.id} (PID ${process.pid})\n` +
              `Processing time: ${processingTime.toFixed(2)}ms\n`);

      // Report to master
      process.send({ type: 'request_handled' });
    }, processingTime);
  });

  server.listen(PORT, () => {
    console.log(`  Worker ${cluster.worker.id} listening on port ${PORT}`);
  });

  /**
   * Handle worker errors gracefully
   */
  server.on('error', (err) => {
    console.error(`Worker ${cluster.worker.id} error:`, err);
  });
}

/**
 * Key Takeaways:
 *
 * 1. Port Sharing:
 *    - All workers can listen on the same port
 *    - Master process owns the port
 *    - Master distributes connections to workers
 *    - This is the "magic" of clustering!
 *
 * 2. Load Balancing:
 *    - Node.js automatically distributes requests
 *    - Uses round-robin by default (on Linux/Mac)
 *    - Each worker gets roughly equal load
 *    - No configuration needed!
 *
 * 3. Scalability:
 *    - Single-process: Uses 1 CPU core
 *    - Clustered: Uses ALL CPU cores
 *    - Throughput increases ~linearly with cores
 *    - Example: 4 cores ≈ 4x throughput
 *
 * 4. How it works:
 *    1. Client connects to port 8000
 *    2. Master process accepts connection
 *    3. Master picks a worker (round-robin)
 *    4. Worker handles the request
 *    5. Worker sends response
 *    6. Connection closes
 *    7. Repeat with next worker
 *
 * 5. Benefits for web servers:
 *    - Handle more concurrent connections
 *    - Better CPU utilization
 *    - Fault tolerance (worker crashes)
 *    - Zero-downtime restarts (Level 2!)
 *
 * 6. Worker independence:
 *    - Each worker has its own event loop
 *    - CPU-intensive work in one worker doesn't block others
 *    - Each worker has separate memory
 *
 * Testing:
 * 1. Start the server: node 05-http-cluster.js
 *
 * 2. In another terminal, send requests:
 *    curl http://localhost:8000
 *    curl http://localhost:8000
 *    curl http://localhost:8000
 *
 * 3. Or use a loop:
 *    for i in {1..10}; do curl http://localhost:8000; done
 *
 * 4. Observe:
 *    - Different workers handle each request
 *    - Requests are distributed evenly
 *    - Check the request distribution stats
 *
 * 5. Load test (if you have apache bench):
 *    ab -n 1000 -c 100 http://localhost:8000/
 *    Compare with single-process version!
 *
 * Try this:
 * - Send multiple requests and watch load distribution
 * - Compare CPU usage vs single-process server
 * - Kill a worker and see requests still work
 * - Check memory usage of each worker process
 */
