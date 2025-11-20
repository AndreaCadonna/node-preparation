# Guide 4: Production Monitoring and Observability

## Introduction

Effective monitoring is essential for running production Node.js clusters. This guide covers comprehensive monitoring strategies, metrics collection, and observability best practices.

## The Three Pillars of Observability

### 1. Metrics
Numerical measurements over time (throughput, latency, errors)

### 2. Logs
Discrete events with context (errors, warnings, debug info)

### 3. Traces  
Request flow through distributed systems

## Essential Metrics

### Application Metrics

**Request Metrics:**
- Total requests
- Requests per second
- Response time (avg, p50, p95, p99)
- Error rate
- Status code distribution

**Worker Metrics:**
- Active connections per worker
- Worker CPU/memory usage
- Worker uptime
- Worker restart count

**System Metrics:**
- Total CPU usage
- Total memory usage
- Event loop lag
- Garbage collection frequency/duration

### Prometheus Integration

```javascript
const promClient = require('prom-client');

// Create metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [50, 100, 200, 500, 1000, 2000, 5000]
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

// Middleware to collect metrics
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);

    httpRequestTotal
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .inc();
  });

  next();
});

// Expose metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(promClient.register.metrics());
});
```

## Structured Logging

### Winston Example

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'cluster-app',
    worker: cluster.worker?.id
  },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Use structured logging
logger.info('Request processed', {
  requestId: req.id,
  method: req.method,
  path: req.path,
  duration: 45,
  statusCode: 200
});
```

## Health Checks

### Liveness and Readiness

```javascript
// Liveness: Is the process alive?
app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Readiness: Can it handle requests?
app.get('/health/ready', async (req, res) => {
  try {
    // Check dependencies
    await checkDatabase();
    await checkRedis();

    res.status(200).json({
      status: 'ready',
      checks: {
        database: 'ok',
        redis: 'ok'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error.message
    });
  }
});
```

## Alerting

### Alert Rules

```javascript
class AlertManager {
  constructor() {
    this.rules = [
      {
        name: 'high_error_rate',
        condition: (metrics) => metrics.errorRate > 5,
        severity: 'critical'
      },
      {
        name: 'slow_response_time',
        condition: (metrics) => metrics.p95 > 1000,
        severity: 'warning'
      },
      {
        name: 'high_memory_usage',
        condition: (metrics) => metrics.memoryUsage > 85,
        severity: 'warning'
      }
    ];
  }

  checkAlerts(metrics) {
    const triggered = [];

    for (const rule of this.rules) {
      if (rule.condition(metrics)) {
        triggered.push({
          name: rule.name,
          severity: rule.severity,
          timestamp: Date.now(),
          metrics
        });
      }
    }

    return triggered;
  }
}
```

## Dashboard Creation

### Real-Time Metrics Dashboard

```html
<!DOCTYPE html>
<html>
<head>
  <title>Cluster Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
  <canvas id="requestsChart"></canvas>
  <canvas id="latencyChart"></canvas>

  <script>
    // Fetch metrics every 2 seconds
    setInterval(async () => {
      const response = await fetch('/metrics/json');
      const data = await response.json();

      updateCharts(data);
    }, 2000);

    function updateCharts(data) {
      // Update request chart
      requestsChart.data.datasets[0].data.push(data.requestsPerSecond);
      requestsChart.update();

      // Update latency chart
      latencyChart.data.datasets[0].data.push(data.p50);
      latencyChart.data.datasets[1].data.push(data.p95);
      latencyChart.data.datasets[2].data.push(data.p99);
      latencyChart.update();
    }
  </script>
</body>
</html>
```

## Best Practices

1. **Monitor what matters**: Focus on user-facing metrics
2. **Set appropriate thresholds**: Based on SLAs and baseline
3. **Alert on trends**: Not just absolute values
4. **Dashboard hierarchy**: Overview → Detail → Debug
5. **Structured logs**: Always use JSON format
6. **Correlation IDs**: Track requests across services
7. **Regular reviews**: Update thresholds as system evolves

## Conclusion

Comprehensive monitoring enables proactive issue detection and rapid troubleshooting. Invest in good monitoring infrastructure early.
