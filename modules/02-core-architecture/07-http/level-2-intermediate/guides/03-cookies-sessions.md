# Cookies and Sessions

## Cookies

Client-side storage sent with every request.

### Setting Cookies

```javascript
res.setHeader('Set-Cookie', 'name=value; HttpOnly; Secure; SameSite=Strict');
```

### Cookie Attributes

- **HttpOnly**: Prevents JavaScript access (XSS protection)
- **Secure**: Only sent over HTTPS
- **SameSite**: CSRF protection (Strict, Lax, None)
- **Max-Age**: Lifetime in seconds
- **Domain**: Cookie scope
- **Path**: URL path scope

## Sessions

Server-side storage identified by session ID in cookie.

### Session Flow

1. User logs in
2. Server creates session, generates ID
3. Session ID sent as cookie
4. Client sends cookie with each request
5. Server retrieves session data by ID

### Session Storage

- **In-memory**: Development only (lost on restart)
- **Redis**: Production (fast, distributed)
- **Database**: Persistent storage

### Security

1. Use cryptographically secure session IDs
2. Set HttpOnly and Secure flags
3. Implement session expiration
4. Rotate session IDs after login
5. Clear sessions on logout
