# File Uploads

## Security Considerations

1. **Validate file type**: Check MIME type and extension
2. **Limit file size**: Prevent DoS attacks
3. **Sanitize filenames**: Remove path traversal attempts
4. **Generate unique names**: Prevent overwrites
5. **Store outside webroot**: Prevent direct access
6. **Scan for malware**: In production

## Implementation Pattern

```javascript
// Validate
if (fileSize > MAX_SIZE) throw new Error('Too large');
if (!ALLOWED_TYPES.includes(mimeType)) throw new Error('Invalid type');

// Generate unique name
const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;

// Save
fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);
```

## Streaming Uploads

For large files, stream to disk:

```javascript
const writeStream = fs.createWriteStream(filepath);
req.pipe(writeStream);
```
