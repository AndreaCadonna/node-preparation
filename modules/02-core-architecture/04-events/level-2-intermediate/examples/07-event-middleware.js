/**
 * Example 7: Event Middleware
 *
 * This example demonstrates:
 * - Building middleware systems for events
 * - Event preprocessing and transformation
 * - Middleware chains
 * - Conditional event handling
 * - Async middleware patterns
 */

const EventEmitter = require('events');

console.log('=== Event Middleware ===\n');

console.log('--- Basic Middleware Pattern ---\n');

class MiddlewareEmitter extends EventEmitter {
  constructor() {
    super();
    this.middleware = [];
  }

  // Add middleware function
  use(fn) {
    console.log('[Setup] Adding middleware function');
    this.middleware.push(fn);
    return this; // Chainable
  }

  // Enhanced emit that runs middleware first
  emitWithMiddleware(event, data) {
    console.log(`[Emit] Starting middleware chain for '${event}'`);

    let processedData = data;

    // Run through middleware synchronously
    for (let i = 0; i < this.middleware.length; i++) {
      const result = this.middleware[i](event, processedData);

      // If middleware returns false, stop the chain
      if (result === false) {
        console.log(`[Middleware] Chain stopped by middleware #${i + 1}`);
        return false;
      }

      // If middleware returns a value, use it as new data
      if (result !== undefined && result !== true) {
        processedData = result;
      }
    }

    // Emit with processed data
    console.log('[Emit] Middleware complete, emitting event');
    this.emit(event, processedData);
    return true;
  }
}

const app = new MiddlewareEmitter();

// Add middleware functions
app.use((event, data) => {
  console.log('[Middleware 1] Logging:', event);
  return data;
});

app.use((event, data) => {
  console.log('[Middleware 2] Adding timestamp');
  return { ...data, timestamp: Date.now() };
});

app.use((event, data) => {
  console.log('[Middleware 3] Validating data');
  if (!data.value) {
    console.log('[Middleware 3] ❌ Validation failed');
    return false; // Stop chain
  }
  return data;
});

// Add event listener
app.on('data', (data) => {
  console.log('[Handler] Received:', data);
});

console.log('Emitting valid data:');
app.emitWithMiddleware('data', { value: 'test' });

console.log('\nEmitting invalid data:');
app.emitWithMiddleware('data', { value: null });

console.log('\n--- Async Middleware Pattern ---\n');

class AsyncMiddlewareEmitter extends EventEmitter {
  constructor() {
    super();
    this.middleware = [];
  }

  use(fn) {
    this.middleware.push(fn);
    return this;
  }

  async emitAsync(event, data) {
    console.log(`[Emit] Starting async middleware for '${event}'`);

    let processedData = data;

    // Run middleware sequentially
    for (let i = 0; i < this.middleware.length; i++) {
      const mw = this.middleware[i];
      console.log(`[Middleware ${i + 1}] Executing...`);

      try {
        const result = await mw(event, processedData);

        if (result === false) {
          console.log(`[Middleware ${i + 1}] Stopped chain`);
          return false;
        }

        if (result !== undefined && result !== true) {
          processedData = result;
        }
      } catch (error) {
        console.error(`[Middleware ${i + 1}] Error:`, error.message);
        this.emit('error', error);
        return false;
      }
    }

    console.log('[Emit] Emitting with processed data');
    this.emit(event, processedData);
    return true;
  }
}

const asyncApp = new AsyncMiddlewareEmitter();

// Add async middleware
asyncApp.use(async (event, data) => {
  console.log('[MW 1] Fetching user data...');
  await new Promise(resolve => setTimeout(resolve, 100));
  return { ...data, user: { id: 1, name: 'Alice' } };
});

asyncApp.use(async (event, data) => {
  console.log('[MW 2] Checking permissions...');
  await new Promise(resolve => setTimeout(resolve, 50));
  return { ...data, authorized: true };
});

asyncApp.use(async (event, data) => {
  console.log('[MW 3] Logging to database...');
  await new Promise(resolve => setTimeout(resolve, 50));
  return data;
});

asyncApp.on('action', (data) => {
  console.log('[Handler] Action received:', data);
});

console.log('Emitting async event:');
asyncApp.emitAsync('action', { type: 'create', resource: 'post' }).then(() => {
  console.log('[Done] Async emit complete');

  setTimeout(() => {
    console.log('\n--- Request/Response Middleware ---\n');

    class RequestMiddleware extends EventEmitter {
      constructor() {
        super();
        this.middleware = [];
      }

      use(fn) {
        this.middleware.push(fn);
        return this;
      }

      async handle(request) {
        console.log(`[Server] Handling ${request.method} ${request.url}`);

        const context = {
          request,
          response: {
            status: 200,
            headers: {},
            body: null
          },
          state: {}
        };

        // Run middleware
        for (const mw of this.middleware) {
          const result = await mw(context);

          if (result === false || context.response.finished) {
            console.log('[Server] Response finished by middleware');
            break;
          }
        }

        // Emit final event
        this.emit('response', context.response);
        return context.response;
      }
    }

    const server = new RequestMiddleware();

    // Auth middleware
    server.use(async (ctx) => {
      console.log('[Auth MW] Checking authentication');

      if (!ctx.request.headers.authorization) {
        ctx.response.status = 401;
        ctx.response.body = { error: 'Unauthorized' };
        ctx.response.finished = true;
        return false;
      }

      ctx.state.user = { id: 1, name: 'Alice' };
      return true;
    });

    // Rate limit middleware
    server.use(async (ctx) => {
      console.log('[Rate Limit MW] Checking rate limit');
      await new Promise(resolve => setTimeout(resolve, 50));

      // Simulate rate limit check
      ctx.state.rateLimit = { remaining: 100 };
      return true;
    });

    // Logger middleware
    server.use(async (ctx) => {
      console.log('[Logger MW] Logging request');
      ctx.state.logged = true;
      return true;
    });

    server.on('response', (response) => {
      console.log('[Server] Response:', response.status, response.body);
    });

    console.log('Request 1 (with auth):');
    server.handle({
      method: 'GET',
      url: '/api/users',
      headers: { authorization: 'Bearer token123' }
    }).then(() => {
      console.log('\nRequest 2 (without auth):');
      return server.handle({
        method: 'GET',
        url: '/api/users',
        headers: {}
      });
    }).then(() => {
      setTimeout(() => {
        console.log('\n--- Event Transformation Pipeline ---\n');

        class Pipeline extends EventEmitter {
          constructor() {
            super();
            this.transformers = [];
          }

          addTransformer(name, fn) {
            console.log(`[Pipeline] Adding transformer: ${name}`);
            this.transformers.push({ name, fn });
            return this;
          }

          async process(data) {
            console.log('[Pipeline] Starting processing');
            let result = data;

            for (const { name, fn } of this.transformers) {
              console.log(`[Transformer: ${name}] Processing...`);
              result = await fn(result);
              this.emit('transform', { name, data: result });
            }

            this.emit('complete', result);
            return result;
          }
        }

        const pipeline = new Pipeline();

        pipeline.on('transform', ({ name, data }) => {
          console.log(`  [Event] ${name} complete`);
        });

        pipeline.on('complete', (data) => {
          console.log('[Event] Pipeline complete:', data);
        });

        // Add transformers
        pipeline
          .addTransformer('Parse', (data) => {
            return JSON.parse(data);
          })
          .addTransformer('Validate', (data) => {
            if (!data.email) {
              throw new Error('Email required');
            }
            return data;
          })
          .addTransformer('Normalize', (data) => {
            return {
              ...data,
              email: data.email.toLowerCase(),
              timestamp: Date.now()
            };
          })
          .addTransformer('Enrich', async (data) => {
            await new Promise(resolve => setTimeout(resolve, 50));
            return {
              ...data,
              userId: Math.random().toString(36).substr(2, 9)
            };
          });

        const input = JSON.stringify({
          email: 'ALICE@EXAMPLE.COM',
          name: 'Alice'
        });

        console.log('Processing:', input);
        pipeline.process(input).then((result) => {
          console.log('Final result:', result);

          setTimeout(() => {
            console.log('\n--- Conditional Middleware ---\n');

            class ConditionalEmitter extends EventEmitter {
              constructor() {
                super();
                this.middleware = [];
              }

              use(condition, fn) {
                this.middleware.push({ condition, fn });
                return this;
              }

              emitConditional(event, data) {
                console.log(`[Emit] Processing '${event}'`);

                let processedData = data;

                for (const { condition, fn } of this.middleware) {
                  // Check if middleware should run
                  const shouldRun = typeof condition === 'function'
                    ? condition(event, processedData)
                    : condition;

                  if (shouldRun) {
                    const result = fn(event, processedData);
                    if (result !== undefined) {
                      processedData = result;
                    }
                  }
                }

                this.emit(event, processedData);
              }
            }

            const conditional = new ConditionalEmitter();

            // Only run for 'user:*' events
            conditional.use(
              (event) => event.startsWith('user:'),
              (event, data) => {
                console.log('[User MW] Processing user event');
                return { ...data, userEvent: true };
              }
            );

            // Only run if data has admin property
            conditional.use(
              (event, data) => data.admin === true,
              (event, data) => {
                console.log('[Admin MW] Processing admin action');
                return { ...data, adminProcessed: true };
              }
            );

            // Always run
            conditional.use(true, (event, data) => {
              console.log('[Logger MW] Logging all events');
              return data;
            });

            conditional.on('user:login', (data) => {
              console.log('[Handler] User login:', data);
            });

            conditional.on('system:status', (data) => {
              console.log('[Handler] System status:', data);
            });

            console.log('Event 1 (user:login, admin):');
            conditional.emitConditional('user:login', { username: 'admin', admin: true });

            console.log('\nEvent 2 (user:login, not admin):');
            conditional.emitConditional('user:login', { username: 'alice', admin: false });

            console.log('\nEvent 3 (system:status):');
            conditional.emitConditional('system:status', { healthy: true });

            console.log('\n=== Example Complete ===');
          }, 100);
        });
      }, 100);
    });
  }, 200);
});

/*
 * Key Takeaways:
 * 1. Middleware intercepts events before listeners
 * 2. Middleware can transform data
 * 3. Middleware can stop event propagation
 * 4. Async middleware enables I/O operations
 * 5. Useful for validation, auth, logging
 * 6. Prepend listeners can act as middleware
 * 7. Middleware chains process sequentially
 * 8. Can implement conditional middleware
 * 9. Pipeline pattern transforms data step-by-step
 * 10. Error handling is critical in middleware
 */
