/**
 * Exercise 2 Solution: Rolling Restart System
 *
 * Complete implementation of zero-downtime rolling restart.
 * Features version tracking, health checks, and sequential worker updates.
 */

const cluster = require('cluster');
const http = require('http');

const PORT = 8000;
const NUM_WORKERS = 4;
let currentVersion = '1.0.0';

if (cluster.isMaster) {
  const workers = new Map();
  let isRestarting = false;

  function incrementVersion(version) {
    const parts = version.split('.');
    const major = parseInt(parts[0]);
    const minor = parseInt(parts[1]);
    const patch = parseInt(parts[2]);
    return `${major}.${minor + 1}.${patch}`;
  }

  function forkWorker(version = currentVersion) {
    const worker = cluster.fork({ WORKER_VERSION: version });

    workers.set(worker.id, {
      worker,
      version,
      startTime: Date.now(),
      ready: false
    });

    console.log(`[Master] Forked worker ${worker.id} (v${version})`);

    worker.on('message', (msg) => {
      const info = workers.get(worker.id);
      if (info && msg.type === 'ready') {
        info.ready = true;
        console.log(`[Master] Worker ${worker.id} ready`);
      }
    });

    return worker;
  }

  for (let i = 0; i < NUM_WORKERS; i++) {
    forkWorker();
  }

  cluster.on('exit', (worker) => {
    console.log(`[Master] Worker ${worker.id} exited`);
    workers.delete(worker.id);

    if (!isRestarting) {
      console.log(`[Master] Unexpected exit, restarting worker`);
      forkWorker();
    }
  });

  async function rollingRestart() {
    if (isRestarting) {
      console.log('Restart already in progress');
      return;
    }

    isRestarting = true;
    const newVersion = incrementVersion(currentVersion);

    console.log(`\n${'='.repeat(50)}`);
    console.log(`Rolling Restart: ${currentVersion} → ${newVersion}`);
    console.log(`${'='.repeat(50)}\n`);

    const workerIds = Array.from(workers.keys());

    for (let i = 0; i < workerIds.length; i++) {
      const workerId = workerIds[i];
      console.log(`[${i + 1}/${workerIds.length}] Restarting worker ${workerId}...`);

      await restartWorker(workerId, newVersion);

      console.log(`[${i + 1}/${workerIds.length}] ✓ Complete\n`);

      if (i < workerIds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    currentVersion = newVersion;
    console.log(`✓ Rolling restart complete! Now at v${currentVersion}\n`);
    isRestarting = false;
  }

  async function restartWorker(workerId, newVersion) {
    const oldWorkerInfo = workers.get(workerId);

    const newWorker = forkWorker(newVersion);

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Worker failed to become ready'));
      }, 30000);

      const checkInterval = setInterval(() => {
        const info = workers.get(newWorker.id);
        if (info && info.ready) {
          clearInterval(checkInterval);
          clearTimeout(timer);
          resolve();
        }
      }, 100);
    });

    oldWorkerInfo.worker.disconnect();

    await new Promise(resolve => {
      const timer = setTimeout(() => {
        oldWorkerInfo.worker.kill('SIGKILL');
        resolve();
      }, 10000);

      oldWorkerInfo.worker.on('exit', () => {
        clearTimeout(timer);
        resolve();
      });
    });

    workers.delete(workerId);
  }

  process.on('SIGUSR2', () => {
    rollingRestart().catch(console.error);
  });

  console.log(`Cluster ready (v${currentVersion})`);
  console.log(`Trigger restart: kill -SIGUSR2 ${process.pid}\n`);

} else {
  const workerVersion = process.env.WORKER_VERSION || '1.0.0';
  const startTime = Date.now();

  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      worker: cluster.worker.id,
      pid: process.pid,
      version: workerVersion,
      uptime: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString()
    }, null, 2) + '\n');
  });

  server.listen(PORT, () => {
    console.log(`[Worker ${cluster.worker.id}] Listening (v${workerVersion})`);

    setTimeout(() => {
      if (process.send) {
        process.send({ type: 'ready' });
      }
    }, 500);
  });
}

/**
 * KEY CONCEPTS:
 *
 * 1. Sequential Restart:
 *    - Restart workers one at a time
 *    - Wait for new worker to be ready before killing old one
 *
 * 2. Version Tracking:
 *    - Pass version via environment variable
 *    - Increment version with each restart
 *    - Include version in HTTP responses
 *
 * 3. Readiness Check:
 *    - Worker sends 'ready' message after initialization
 *    - Master waits for ready before proceeding
 *
 * 4. Graceful Shutdown:
 *    - Use disconnect() for graceful shutdown
 *    - Force kill after timeout if needed
 */
