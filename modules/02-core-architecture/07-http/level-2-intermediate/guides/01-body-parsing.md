# Body Parsing

## Content Types

### application/json

```javascript
const contentType = req.headers['content-type'];
if (contentType && contentType.includes('application/json')) {
  const data = JSON.parse(body);
}
```

### application/x-www-form-urlencoded

```javascript
const querystring = require('querystring');
const data = querystring.parse(body);
// name=Alice&age=30 → { name: 'Alice', age: '30' }
```

### multipart/form-data

For file uploads. Requires parsing boundaries:

```
--boundary
Content-Disposition: form-data; name="file"; filename="test.txt"

file content here
--boundary--
```

## Best Practices

1. Always set size limits
2. Validate content type
3. Handle parsing errors
4. Use streams for large bodies
5. Consider using libraries (formidable, busboy)
