/**
 * Solution 3: Build a Processing Pipeline with MessageChannel
 *
 * This solution demonstrates:
 * - Creating multi-stage processing pipeline
 * - Using MessageChannel for worker-to-worker communication
 * - Connecting workers in sequence
 * - Processing data through multiple stages
 */

const { Worker, isMainThread, parentPort, workerData, MessageChannel } = require('worker_threads');

if (isMainThread) {
  console.log('=== Processing Pipeline Solution ===\n');

  // Create test data
  const testData = [
    { id: 1, value: 10, valid: true },
    { id: 2, value: 5, valid: false },   // Will be filtered
    { id: 3, value: 20, valid: true },
    { id: 4, value: 15, valid: true },
    { id: 5, value: 8, valid: false },   // Will be filtered
    { id: 6, value: 25, valid: true }
  ];

  console.log('Input data:', testData);
  console.log('Creating pipeline: Validator → Transformer → Aggregator\n');

  // Create workers for each stage
  const validator = new Worker(__filename, {
    workerData: { role: 'validator' }
  });

  const transformer = new Worker(__filename, {
    workerData: { role: 'transformer' }
  });

  const aggregator = new Worker(__filename, {
    workerData: { role: 'aggregator' }
  });

  // Create channels to connect workers
  const { port1: validatorOut, port2: transformerIn } = new MessageChannel();
  const { port1: transformerOut, port2: aggregatorIn } = new MessageChannel();

  // Setup validator (receives from main, sends to transformer)
  console.log('Connecting Validator → Transformer');
  validator.postMessage({
    type: 'setup',
    outputPort: validatorOut
  }, [validatorOut]);

  // Setup transformer (receives from validator, sends to aggregator)
  console.log('Connecting Transformer → Aggregator');
  transformer.postMessage({
    type: 'setup',
    inputPort: transformerIn,
    outputPort: transformerOut
  }, [transformerIn, transformerOut]);

  // Setup aggregator (receives from transformer, sends to main)
  console.log('Connecting Aggregator → Main');
  aggregator.postMessage({
    type: 'setup',
    inputPort: aggregatorIn
  }, [aggregatorIn]);

  // Listen for final results from aggregator
  aggregator.on('message', (result) => {
    console.log('\n=== Pipeline Results ===');
    console.log('Valid items processed:', result.count);
    console.log('Total value (after transform):', result.total);
    console.log('Average value:', result.average);
    console.log('Items:', result.items);

    // Cleanup
    setTimeout(() => {
      validator.terminate();
      transformer.terminate();
      aggregator.terminate();
    }, 100);
  });

  // Send data into the pipeline
  console.log('\nSending data into pipeline...\n');
  validator.postMessage({
    type: 'data',
    data: testData
  });

} else {
  // Worker code
  const { role } = workerData;

  let inputPort, outputPort;

  console.log(`[${role}] Worker started`);

  parentPort.on('message', (msg) => {
    if (msg.type === 'setup') {
      // Setup communication ports
      if (msg.inputPort) {
        inputPort = msg.inputPort;
        console.log(`[${role}] Input port configured`);

        inputPort.on('message', (data) => {
          console.log(`[${role}] Received data from previous stage`);
          processData(data);
        });
      }

      if (msg.outputPort) {
        outputPort = msg.outputPort;
        console.log(`[${role}] Output port configured`);
      }

    } else if (msg.type === 'data') {
      // Receive data from main thread
      console.log(`[${role}] Received data from main thread`);
      processData(msg.data);
    }
  });

  function processData(data) {
    let result;

    switch (role) {
      case 'validator':
        // Filter out invalid items
        result = data.filter(item => item.valid);
        console.log(`[${role}] Filtered ${data.length} → ${result.length} items`);

        // Send to next stage
        if (outputPort) {
          outputPort.postMessage(result);
        }
        break;

      case 'transformer':
        // Transform each item (double the value)
        result = data.map(item => ({
          ...item,
          value: item.value * 2
        }));
        console.log(`[${role}] Transformed ${result.length} items (doubled values)`);

        // Send to next stage
        if (outputPort) {
          outputPort.postMessage(result);
        }
        break;

      case 'aggregator':
        // Aggregate results
        const count = data.length;
        const total = data.reduce((sum, item) => sum + item.value, 0);
        const average = count > 0 ? total / count : 0;

        result = {
          count,
          total,
          average,
          items: data
        };

        console.log(`[${role}] Aggregated ${count} items, total: ${total}`);

        // Send final result to main thread
        parentPort.postMessage(result);
        break;
    }
  }
}

/**
 * EXPECTED OUTPUT:
 *
 * Input: 6 items (2 invalid)
 * Validator: Filters to 4 valid items
 * Transformer: Doubles values (10→20, 20→40, 15→30, 25→50)
 * Aggregator: Sums to 140, average 35
 *
 * KEY CONCEPTS:
 * 1. Workers communicate directly via MessageChannel
 * 2. Main thread only orchestrates, doesn't handle data
 * 3. Efficient pipeline processing
 * 4. Each stage is independent and testable
 *
 * BONUS FEATURES:
 * - Add timing per stage
 * - Support parallel pipelines
 * - Add error handling between stages
 * - Implement backpressure
 */
