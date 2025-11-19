/**
 * Exercise 3: Build a Processing Pipeline with MessageChannel
 *
 * TASK:
 * Create a data processing pipeline where multiple workers process
 * data in stages using MessageChannel for direct communication.
 *
 * REQUIREMENTS:
 * 1. Create 3 workers: Validator, Transformer, Aggregator
 * 2. Connect them using MessageChannel (Validator → Transformer → Aggregator)
 * 3. Validator: Filters invalid data
 * 4. Transformer: Transforms valid data
 * 5. Aggregator: Aggregates results and sends to main thread
 *
 * BONUS:
 * - Add error handling between stages
 * - Track processing time per stage
 * - Support multiple parallel pipelines
 *
 * INPUT DATA:
 * Array of objects: { id: number, value: number, valid: boolean }
 *
 * EXPECTED FLOW:
 * Main → Validator → (filter invalid) → Transformer → (transform) → Aggregator → Main
 */

const { Worker, isMainThread, parentPort, workerData, MessageChannel } = require('worker_threads');

if (isMainThread) {
  console.log('=== Processing Pipeline Exercise ===\n');

  // TODO: Implement pipeline
  // 1. Create 3 workers (validator, transformer, aggregator)
  // 2. Create MessageChannels to connect them
  // 3. Send test data through pipeline
  // 4. Receive and display final results

  const testData = [
    { id: 1, value: 10, valid: true },
    { id: 2, value: 5, valid: false },
    { id: 3, value: 20, valid: true },
    { id: 4, value: 15, valid: true },
    { id: 5, value: 8, valid: false },
    { id: 6, value: 25, valid: true }
  ];

  // Your code here...

} else {
  // Worker code
  const { role } = workerData;

  let inputPort, outputPort;

  parentPort.on('message', (msg) => {
    if (msg.type === 'setup') {
      if (msg.inputPort) {
        inputPort = msg.inputPort;
        inputPort.on('message', processData);
      }
      if (msg.outputPort) {
        outputPort = msg.outputPort;
      }
    } else if (msg.type === 'data') {
      processData(msg.data);
    }
  });

  function processData(data) {
    // TODO: Implement processing logic for each role
    // - 'validator': Filter out items where valid === false
    // - 'transformer': Double the value of each item
    // - 'aggregator': Sum all values and send to main thread

    // Your code here...
  }
}
