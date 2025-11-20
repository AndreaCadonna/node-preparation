/**
 * Exercise 3 Solution: Build a Processing Pipeline with MessageChannel
 *
 * This solution demonstrates:
 * - Direct worker-to-worker communication using MessageChannel
 * - Multi-stage data processing pipeline
 * - Decoupled worker architecture
 * - Port-based communication
 * - Pipeline pattern for data flow
 *
 * KEY CONCEPTS:
 * - MessageChannel: Creates a two-way communication channel
 * - Port Transfer: Ports can be transferred between workers
 * - Pipeline Architecture: Workers process data in stages
 * - Decoupling: Workers don't know about each other, only ports
 * - Data Flow: Main → Validator → Transformer → Aggregator → Main
 */

const { Worker, isMainThread, parentPort, workerData, MessageChannel } = require('worker_threads');

if (isMainThread) {
  console.log('=== Processing Pipeline Exercise ===\n');

  /**
   * Test data for the pipeline
   * Will be filtered, transformed, and aggregated
   */
  const testData = [
    { id: 1, value: 10, valid: true },
    { id: 2, value: 5, valid: false },
    { id: 3, value: 20, valid: true },
    { id: 4, value: 15, valid: true },
    { id: 5, value: 8, valid: false },
    { id: 6, value: 25, valid: true }
  ];

  /**
   * Creates a worker with specific role
   */
  function createWorker(role) {
    return new Worker(__filename, {
      workerData: { role }
    });
  }

  /**
   * Main pipeline execution
   */
  async function runPipeline() {
    console.log('Setting up processing pipeline...\n');

    // Create workers for each stage
    const validator = createWorker('validator');
    const transformer = createWorker('transformer');
    const aggregator = createWorker('aggregator');

    console.log('✓ Created Validator worker');
    console.log('✓ Created Transformer worker');
    console.log('✓ Created Aggregator worker');

    // Create MessageChannels to connect workers
    // Channel 1: Validator → Transformer
    const channel1 = new MessageChannel();

    // Channel 2: Transformer → Aggregator
    const channel2 = new MessageChannel();

    console.log('\n✓ Created MessageChannels for worker connections\n');

    // Setup pipeline connections
    console.log('Connecting pipeline stages...');

    // Validator: receives from main, sends to transformer
    validator.postMessage({
      type: 'setup',
      outputPort: channel1.port1
    }, [channel1.port1]); // Transfer port ownership to validator

    console.log('  Validator → Transformer (channel 1)');

    // Transformer: receives from validator, sends to aggregator
    transformer.postMessage({
      type: 'setup',
      inputPort: channel1.port2,
      outputPort: channel2.port1
    }, [channel1.port2, channel2.port1]); // Transfer both ports

    console.log('  Transformer → Aggregator (channel 2)');

    // Aggregator: receives from transformer, sends to main
    aggregator.postMessage({
      type: 'setup',
      inputPort: channel2.port2
    }, [channel2.port2]); // Transfer port ownership to aggregator

    console.log('  Aggregator → Main thread\n');

    // Listen for final results from aggregator
    return new Promise((resolve, reject) => {
      // Set timeout for pipeline completion
      const timeout = setTimeout(() => {
        reject(new Error('Pipeline timeout'));
      }, 10000);

      aggregator.on('message', (result) => {
        clearTimeout(timeout);

        console.log('=== Pipeline Results ===');
        console.log(JSON.stringify(result, null, 2));

        // Cleanup: terminate all workers
        Promise.all([
          validator.terminate(),
          transformer.terminate(),
          aggregator.terminate()
        ]).then(() => {
          console.log('\n✓ Pipeline completed and workers terminated');
          resolve(result);
        });
      });

      aggregator.on('error', reject);

      // Start the pipeline by sending data to validator
      console.log('Starting pipeline with test data...\n');
      console.log('Input data:', JSON.stringify(testData, null, 2));
      console.log();

      validator.postMessage({
        type: 'data',
        data: testData
      });
    });
  }

  // Run the pipeline
  runPipeline().catch(console.error);

} else {
  /**
   * Worker Thread Code
   *
   * Each worker has a specific role in the pipeline
   */
  const { role } = workerData;

  let inputPort = null;
  let outputPort = null;

  // Handle setup and data messages from main thread
  parentPort.on('message', (msg) => {
    if (msg.type === 'setup') {
      // Setup phase: receive port connections
      if (msg.inputPort) {
        inputPort = msg.inputPort;
        // Listen for data from previous stage
        inputPort.on('message', processData);
      }

      if (msg.outputPort) {
        outputPort = msg.outputPort;
      }

      console.log(`[${role.toUpperCase()}] Worker configured`);

    } else if (msg.type === 'data') {
      // Data from main thread
      processData(msg.data);
    }
  });

  /**
   * Process data based on worker role
   * Each role implements a specific stage of the pipeline
   */
  function processData(data) {
    console.log(`[${role.toUpperCase()}] Received data:`, JSON.stringify(data));

    let result;

    switch (role) {
      case 'validator':
        /**
         * VALIDATOR STAGE:
         * Filters out invalid items
         * Passes only items where valid === true
         */
        result = data.filter(item => {
          if (item.valid) {
            console.log(`[VALIDATOR] ✓ Item ${item.id} is valid`);
            return true;
          } else {
            console.log(`[VALIDATOR] ✗ Item ${item.id} is invalid (filtered out)`);
            return false;
          }
        });

        console.log(`[VALIDATOR] Filtered: ${data.length} → ${result.length} items`);

        // Send to next stage (transformer) via MessageChannel
        if (outputPort) {
          outputPort.postMessage(result);
          console.log(`[VALIDATOR] → Sent to Transformer\n`);
        }
        break;

      case 'transformer':
        /**
         * TRANSFORMER STAGE:
         * Transforms each item by doubling its value
         */
        result = data.map(item => {
          const transformed = {
            ...item,
            value: item.value * 2
          };
          console.log(`[TRANSFORMER] Transformed item ${item.id}: ${item.value} → ${transformed.value}`);
          return transformed;
        });

        console.log(`[TRANSFORMER] Transformed ${result.length} items`);

        // Send to next stage (aggregator) via MessageChannel
        if (outputPort) {
          outputPort.postMessage(result);
          console.log(`[TRANSFORMER] → Sent to Aggregator\n`);
        }
        break;

      case 'aggregator':
        /**
         * AGGREGATOR STAGE:
         * Aggregates results and computes statistics
         */
        const totalValue = data.reduce((sum, item) => sum + item.value, 0);
        const avgValue = totalValue / data.length;
        const itemCount = data.length;
        const itemIds = data.map(item => item.id);

        result = {
          summary: {
            itemCount,
            totalValue,
            avgValue: parseFloat(avgValue.toFixed(2)),
            itemIds
          },
          items: data
        };

        console.log(`[AGGREGATOR] Aggregated ${itemCount} items`);
        console.log(`[AGGREGATOR] Total value: ${totalValue}`);
        console.log(`[AGGREGATOR] Average value: ${avgValue.toFixed(2)}`);

        // Send final result back to main thread
        parentPort.postMessage(result);
        console.log(`[AGGREGATOR] → Sent final result to Main\n`);
        break;

      default:
        console.error(`[ERROR] Unknown role: ${role}`);
    }
  }
}

/**
 * LEARNING NOTES:
 *
 * 1. MESSAGE CHANNEL BASICS:
 *    const channel = new MessageChannel();
 *    // Creates two connected ports: port1 and port2
 *    channel.port1.postMessage('hello');
 *    channel.port2.on('message', (msg) => console.log(msg)); // 'hello'
 *
 * 2. PORT TRANSFER:
 *    - Ports can be transferred between threads
 *    - Creates direct worker-to-worker communication
 *    - Main thread doesn't relay messages (more efficient)
 *    - Use transfer list when sending ports
 *
 * 3. PIPELINE PATTERN:
 *    Main → Worker A → Worker B → Worker C → Main
 *         (channel1)  (channel2)  (channel3)
 *
 *    Benefits:
 *    - Separation of concerns (each worker does one thing)
 *    - Parallel processing (each stage can process different items)
 *    - Scalability (add/remove stages easily)
 *    - Testability (test each stage independently)
 *
 * 4. PIPELINE ARCHITECTURE:
 *    [Main Thread]
 *         ↓ (postMessage)
 *    [Validator Worker] ← filters data
 *         ↓ (MessageChannel port1 → port2)
 *    [Transformer Worker] ← transforms data
 *         ↓ (MessageChannel port1 → port2)
 *    [Aggregator Worker] ← aggregates results
 *         ↓ (postMessage)
 *    [Main Thread]
 *
 * 5. ERROR HANDLING IN PIPELINE:
 *    - Each stage should validate input
 *    - Propagate errors through the pipeline
 *    - Have timeout for entire pipeline
 *    - Cleanup workers on error
 *
 * BONUS: PARALLEL PIPELINE
 *
 * For high throughput, create multiple parallel pipelines:
 *
 * class PipelinePool {
 *   constructor(pipelineCount = 4) {
 *     this.pipelines = [];
 *     for (let i = 0; i < pipelineCount; i++) {
 *       this.pipelines.push(this.createPipeline());
 *     }
 *     this.currentPipeline = 0;
 *   }
 *
 *   async process(data) {
 *     const pipeline = this.pipelines[this.currentPipeline];
 *     this.currentPipeline = (this.currentPipeline + 1) % this.pipelines.length;
 *     return pipeline.process(data);
 *   }
 * }
 *
 * BONUS: BIDIRECTIONAL PIPELINE
 *
 * For processing that needs feedback:
 *
 * // Create two channels for bidirectional communication
 * const forwardChannel = new MessageChannel();
 * const backwardChannel = new MessageChannel();
 *
 * worker1.postMessage({
 *   output: forwardChannel.port1,
 *   input: backwardChannel.port2
 * }, [forwardChannel.port1, backwardChannel.port2]);
 *
 * worker2.postMessage({
 *   input: forwardChannel.port2,
 *   output: backwardChannel.port1
 * }, [forwardChannel.port2, backwardChannel.port1]);
 *
 * BONUS: ERROR PROPAGATION
 *
 * function processData(data) {
 *   try {
 *     // Process data
 *     const result = transform(data);
 *     outputPort.postMessage({ success: true, data: result });
 *   } catch (error) {
 *     // Send error to next stage
 *     outputPort.postMessage({
 *       success: false,
 *       error: error.message,
 *       stage: role
 *     });
 *   }
 * }
 *
 * BONUS: MONITORING PIPELINE
 *
 * Track performance metrics for each stage:
 *
 * const metrics = {
 *   validator: { processed: 0, duration: 0 },
 *   transformer: { processed: 0, duration: 0 },
 *   aggregator: { processed: 0, duration: 0 }
 * };
 *
 * function processData(data) {
 *   const startTime = Date.now();
 *
 *   // Process...
 *
 *   const duration = Date.now() - startTime;
 *   metrics[role].processed++;
 *   metrics[role].duration += duration;
 *
 *   outputPort.postMessage({
 *     data: result,
 *     metrics: { stage: role, duration }
 *   });
 * }
 */
