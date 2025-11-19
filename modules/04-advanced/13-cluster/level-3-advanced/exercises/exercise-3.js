/**
 * Exercise 3: Create Production Monitoring Dashboard
 *
 * Build a comprehensive monitoring system for a clustered application with
 * real-time metrics, alerting, and performance analysis.
 *
 * Requirements:
 * 1. Collect metrics from all workers:
 *    - Request throughput and latency
 *    - CPU and memory usage
 *    - Event loop lag
 *    - Error rates
 * 2. Calculate percentiles (p50, p95, p99) for response times
 * 3. Create real-time dashboard with auto-refresh
 * 4. Export metrics in Prometheus format
 * 5. Implement alerting thresholds
 * 6. Create historical data retention
 *
 * Features to Implement:
 * - Real-time metrics aggregation
 * - Per-worker and cluster-wide statistics
 * - Interactive HTML dashboard
 * - Metrics export API (JSON and Prometheus)
 * - Alert system with configurable thresholds
 * - Performance trend analysis
 *
 * Bonus Challenges:
 * 1. Add metric streaming via WebSocket
 * 2. Implement metric retention and downsampling
 * 3. Create custom metric types (counters, gauges, histograms)
 * 4. Add distributed tracing (request ID tracking)
 * 5. Implement SLA monitoring (99.9% uptime, p99 < 200ms)
 * 6. Create metric-based auto-scaling recommendations
 *
 * Testing Requirements:
 * - All metrics collected accurately
 * - Percentiles calculated correctly
 * - Dashboard updates in real-time
 * - Prometheus format valid
 * - Alerts trigger at correct thresholds
 *
 * Your implementation should be below this comment block.
 */

const cluster = require('cluster');
const http = require('http');
const os = require('os');

const PORT = 8000;
const numCPUs = Math.min(4, os.cpus().length);
const METRICS_INTERVAL = 1000; // Collect every second

// TODO: Implement MetricsCollector
class MetricsCollector {
  constructor() {
    // TODO: Initialize metrics storage
  }

  // TODO: Implement recordRequest(workerId, duration, success)
  recordRequest(workerId, duration, success) {
    // Record individual request metrics
  }

  // TODO: Implement recordWorkerHealth(workerId, cpu, memory, eventLoopLag)
  recordWorkerHealth(workerId, cpu, memory, eventLoopLag) {
    // Record worker health metrics
  }

  // TODO: Implement getWorkerMetrics(workerId)
  getWorkerMetrics(workerId) {
    // Return metrics for specific worker
  }

  // TODO: Implement getClusterMetrics()
  getClusterMetrics() {
    // Return aggregated cluster metrics
  }

  // TODO: Implement calculatePercentiles(data, percentiles)
  calculatePercentiles(data, percentiles) {
    // Calculate p50, p95, p99 from response time data
  }

  // TODO: Implement getPrometheusMetrics()
  getPrometheusMetrics() {
    // Return metrics in Prometheus text format
  }
}

// TODO: Implement AlertManager
class AlertManager {
  constructor() {
    // TODO: Initialize alert configuration
  }

  // TODO: Implement defineAlert(name, condition, threshold)
  defineAlert(name, condition, threshold) {
    // Define alert rules
  }

  // TODO: Implement checkAlerts(metrics)
  checkAlerts(metrics) {
    // Check if any alert conditions met
    // Return array of triggered alerts
  }

  // TODO: Implement getActiveAlerts()
  getActiveAlerts() {
    // Return currently active alerts
  }
}

// TODO: Implement PerformanceAnalyzer
class PerformanceAnalyzer {
  constructor() {
    // TODO: Initialize historical data storage
  }

  // TODO: Implement analyzePerformance(metrics)
  analyzePerformance(metrics) {
    // Analyze performance trends
    // Return insights and recommendations
  }

  // TODO: Implement detectAnomalies(metrics)
  detectAnomalies(metrics) {
    // Detect performance anomalies
  }
}

if (cluster.isMaster) {
  console.log('[Master] TODO: Implement monitoring dashboard master process');

  // TODO: Initialize MetricsCollector
  // TODO: Initialize AlertManager
  // TODO: Initialize PerformanceAnalyzer
  // TODO: Fork workers
  // TODO: Collect metrics from workers
  // TODO: Create HTTP server with:
  //   - Dashboard endpoint (HTML)
  //   - Metrics API endpoint (JSON)
  //   - Prometheus endpoint
  //   - Alerts endpoint
  // TODO: Implement periodic metric aggregation
  // TODO: Check alerts periodically

} else {
  console.log('[Worker] TODO: Implement worker with metrics reporting');

  // TODO: Measure event loop lag
  // TODO: Send periodic health metrics to master
  // TODO: Report request metrics on completion
  // TODO: Handle requests

}

/**
 * DASHBOARD REQUIREMENTS:
 *
 * Should display:
 * - Cluster overview (workers, uptime, status)
 * - Request metrics (total, rate, errors)
 * - Response time percentiles (p50, p95, p99)
 * - Per-worker breakdown
 * - Resource usage charts
 * - Active alerts
 * - Auto-refresh every 2 seconds
 *
 * PROMETHEUS METRICS FORMAT:
 *
 * # HELP nodejs_cluster_requests_total Total requests
 * # TYPE nodejs_cluster_requests_total counter
 * nodejs_cluster_requests_total{worker="1"} 1234
 *
 * # HELP nodejs_cluster_response_time_ms Response time
 * # TYPE nodejs_cluster_response_time_ms histogram
 * nodejs_cluster_response_time_ms{percentile="50"} 45.2
 *
 * ALERT EXAMPLES:
 *
 * - High error rate: > 5%
 * - Slow response: p95 > 500ms
 * - High CPU: > 80%
 * - Event loop lag: > 100ms
 * - Worker unavailable
 *
 * TESTING CHECKLIST:
 *
 * [ ] All metrics collected from workers
 * [ ] Percentiles calculated correctly
 * [ ] Dashboard displays real-time data
 * [ ] Prometheus format is valid
 * [ ] Alerts trigger appropriately
 * [ ] Historical data retained
 * [ ] Performance analysis provides insights
 * [ ] At least 2 bonus challenges completed
 *
 * SUCCESS CRITERIA:
 * - Complete monitoring coverage
 * - Real-time dashboard functional
 * - Prometheus integration working
 * - Alert system operational
 * - Production-ready implementation
 */
