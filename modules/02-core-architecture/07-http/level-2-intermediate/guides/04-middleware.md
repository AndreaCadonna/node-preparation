# Middleware Pattern

## What is Middleware?

Functions that execute in sequence, each with access to request and response.

```javascript
function middleware(req, res, next) {
  // Do something
  next(); // Pass to next middleware
}
```

## Middleware Types

### 1. Application-level

Runs for all requests:

```javascript
app.use(logger);
app.use(bodyParser);
```

### 2. Router-level

Runs for specific routes:

```javascript
router.get('/users', authCheck, getUsers);
```

### 3. Error-handling

Has 4 parameters:

```javascript
function errorHandler(err, req, res, next) {
  res.statusCode = 500;
  res.end('Error: ' + err.message);
}
```

## Common Middleware

1. **Logger**: Log requests
2. **Body Parser**: Parse request body
3. **Cookie Parser**: Parse cookies
4. **Authentication**: Check auth
5. **CORS**: Add CORS headers
6. **Compression**: Compress responses
7. **Rate Limiting**: Prevent abuse

## Execution Order

Middleware execute in the order they are added:

```javascript
app.use(logger);      // 1. Log
app.use(bodyParser);  // 2. Parse body
app.use(auth);        // 3. Check auth
app.use(routes);      // 4. Handle routes
app.use(errorHandler); // 5. Handle errors
```
