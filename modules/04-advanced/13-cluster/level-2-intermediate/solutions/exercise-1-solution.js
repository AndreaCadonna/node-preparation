/**
 * Exercise 1 Solution: Graceful Shutdown with Timeout
 *
 * This solution demonstrates:
 * - Connection tracking
 * - Graceful shutdown coordination
 * - Timeout-based forced cleanup
 * - Request rejection during shutdown
 *
 * Key patterns implemented:
 * - Master-worker shutdown coordination
 * - Connection draining with timeout
 * - Proper cleanup and resource management
 */

const cluster = require('cluster');
const http = require('http');

const PORT = 8000;
const SHUTDOWN_TIMEOUT = 10000;
const NUM_WORKERS = 2;

if (cluster.isMaster) {
  console.log(`[Master ${process.pid}] Starting cluster\n`);

  const workers = new Map();

  // Fork workers
  for (let i = 0; i < NUM_WORKERS; i++) {
    const worker = cluster.fork();
    workers.set(worker.id, {
      worker,
      shuttingDown: false,
      startTime: Date.now()
    });

    console.log(`[Master] Forked worker ${worker.id} (PID ${worker.process.pid})`);

    worker.on('message', (msg) => {
      if (msg.type === 'shutdown-complete') {
        console.log(`[Master] Worker ${worker.id} completed graceful shutdown`);
        workers.delete(worker.id);
      }
    });
  }

  cluster.on('exit', (worker, code, signal) => {
    const workerInfo = workers.get(worker.id);

    if (workerInfo && !workerInfo.shuttingDown) {
      console.log(`[Master] Worker ${worker.id} crashed, restarting`);
      workers.delete(worker.id);

      const newWorker = cluster.fork();
      workers.set(newWorker.id, {
        worker: newWorker,
        shuttingDown: false,
        startTime: Date.now()
      });
    }
  });

  function masterShutdown(signal) {
    console.log(`\n[Master] Received ${signal}, initiating graceful shutdown`);
    console.log(`[Master] Shutting down ${workers.size} workers\n`);

    workers.forEach((info, id) => {
      info.shuttingDown = true;
      info.worker.send({ type: 'shutdown' });
    });

    const forceTimer = setTimeout(() => {
      console.log(`[Master] Timeout reached, forcing exit`);
      workers.forEach((info) => {
        info.worker.kill('SIGKILL');
      });
      process.exit(1);
    }, SHUTDOWN_TIMEOUT + 5000);

    const checkInterval = setInterval(() => {
      if (workers.size === 0) {
        clearInterval(checkInterval);
        clearTimeout(forceTimer);
        console.log(`[Master] All workers shutdown, exiting`);
        process.exit(0);
      }
    }, 100);
  }

  process.on('SIGTERM', () => masterShutdown('SIGTERM'));
  process.on('SIGINT', () => masterShutdown('SIGINT'));

  console.log(`[Master] Cluster ready. Press Ctrl+C for graceful shutdown\n`);

} else {
  // Worker process
  let isShuttingDown = false;
  const connections = new Set();

  const server = http.createServer((req, res) => {
    if (isShuttingDown) {
      res.writeHead(503, { 'Connection': 'close' });
      res.end('Service Unavailable - Server is shutting down\n');
      return;
    }

    console.log(`[Worker ${cluster.worker.id}] Handling ${req.method} ${req.url}`);

    if (req.url === '/slow') {
      setTimeout(() => {
        res.writeHead(200);
        res.end(`Slow response from worker ${cluster.worker.id}\n`);
      }, 5000);
    } else if (req.url === '/fast') {
      res.writeHead(200);
      res.end(`Fast response from worker ${cluster.worker.id}\n`);
    } else {
      setTimeout(() => {
        res.writeHead(200);
        res.end(`Response from worker ${cluster.worker.id}\n`);
      }, 1000);
    }
  });

  server.on('connection', (socket) => {
    connections.add(socket);
    socket.on('close', () => connections.delete(socket));
  });

  async function workerShutdown() {
    if (isShuttingDown) return;

    isShuttingDown = true;
    console.log(`[Worker ${cluster.worker.id}] Starting graceful shutdown`);
    console.log(`[Worker ${cluster.worker.id}] Active connections: ${connections.size}`);

    server.close(() => {
      console.log(`[Worker ${cluster.worker.id}] Server closed`);

      if (process.send) {
        process.send({ type: 'shutdown-complete' });
      }

      console.log(`[Worker ${cluster.worker.id}] Shutdown complete`);
      process.exit(0);
    });

    setTimeout(() => {
      console.log(`[Worker ${cluster.worker.id}] Timeout, destroying ${connections.size} connections`);
      connections.forEach((socket) => socket.destroy());
    }, SHUTDOWN_TIMEOUT);
  }

  process.on('message', (msg) => {
    if (msg.type === 'shutdown') {
      workerShutdown();
    }
  });

  process.on('SIGTERM', workerShutdown);
  process.on('SIGINT', workerShutdown);

  server.listen(PORT, () => {
    console.log(`[Worker ${cluster.worker.id}] Listening on port ${PORT}`);
  });
}
