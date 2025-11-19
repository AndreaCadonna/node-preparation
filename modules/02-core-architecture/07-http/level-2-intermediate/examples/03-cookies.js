/**
 * Example 3: Cookie Management
 *
 * Demonstrates:
 * - Setting cookies
 * - Reading cookies
 * - Cookie attributes (HttpOnly, Secure, SameSite)
 * - Cookie parsing
 */

const http = require('http');
const url = require('url');

console.log('=== Cookie Management Example ===\n');

// Parse cookies from header
function parseCookies(cookieHeader) {
  const cookies = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      cookies[name] = decodeURIComponent(value);
    });
  }
  return cookies;
}

// Format cookie with attributes
function formatCookie(name, value, options = {}) {
  let cookie = `${name}=${encodeURIComponent(value)}`;

  if (options.maxAge) {
    cookie += `; Max-Age=${options.maxAge}`;
  }

  if (options.expires) {
    cookie += `; Expires=${options.expires.toUTCString()}`;
  }

  if (options.path) {
    cookie += `; Path=${options.path}`;
  }

  if (options.domain) {
    cookie += `; Domain=${options.domain}`;
  }

  if (options.httpOnly) {
    cookie += '; HttpOnly';
  }

  if (options.secure) {
    cookie += '; Secure';
  }

  if (options.sameSite) {
    cookie += `; SameSite=${options.sameSite}`;
  }

  return cookie;
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const cookies = parseCookies(req.headers.cookie);

  console.log('Cookies:', cookies);

  if (pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cookie Management</title>
        <style>
          body { font-family: Arial; max-width: 800px; margin: 50px auto; }
          .cookie { background: #f0f0f0; padding: 10px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <h1>Cookie Management Example</h1>

        <h2>Current Cookies:</h2>
        <div class="cookie">
          <pre>${JSON.stringify(cookies, null, 2)}</pre>
        </div>

        <h2>Actions:</h2>
        <ul>
          <li><a href="/set-cookie?name=username&value=Alice">Set username cookie</a></li>
          <li><a href="/set-cookie?name=theme&value=dark">Set theme cookie</a></li>
          <li><a href="/set-persistent">Set persistent cookie (30 days)</a></li>
          <li><a href="/set-session">Set session cookie</a></li>
          <li><a href="/set-secure">Set secure cookie (HttpOnly, Secure)</a></li>
          <li><a href="/delete-cookie?name=username">Delete username cookie</a></li>
          <li><a href="/clear-all">Clear all cookies</a></li>
        </ul>

        <h2>View Cookies:</h2>
        <ul>
          <li><a href="/show-cookies">Show all cookies as JSON</a></li>
        </ul>
      </body>
      </html>
    `);
  } else if (pathname === '/set-cookie') {
    const { name, value } = parsedUrl.query;

    if (name && value) {
      const cookie = formatCookie(name, value, { path: '/' });
      res.writeHead(302, {
        'Location': '/',
        'Set-Cookie': cookie
      });
      res.end();
    } else {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Missing name or value parameter');
    }
  } else if (pathname === '/set-persistent') {
    // Cookie that lasts 30 days
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);

    const cookie = formatCookie('persistent', 'value123', {
      expires: expires,
      path: '/',
      httpOnly: true
    });

    res.writeHead(302, {
      'Location': '/',
      'Set-Cookie': cookie
    });
    res.end();
  } else if (pathname === '/set-session') {
    // Session cookie (no expiry)
    const sessionId = Math.random().toString(36).substring(7);
    const cookie = formatCookie('sessionId', sessionId, {
      path: '/',
      httpOnly: true,
      sameSite: 'Strict'
    });

    res.writeHead(302, {
      'Location': '/',
      'Set-Cookie': cookie
    });
    res.end();
  } else if (pathname === '/set-secure') {
    // Secure cookie (HTTPS only, HttpOnly)
    const cookie = formatCookie('secureData', 'sensitive', {
      path: '/',
      httpOnly: true,
      secure: true, // Only sent over HTTPS
      sameSite: 'Strict'
    });

    res.writeHead(302, {
      'Location': '/',
      'Set-Cookie': cookie
    });
    res.end();
  } else if (pathname === '/delete-cookie') {
    const { name } = parsedUrl.query;

    if (name) {
      // Delete by setting expiry in the past
      const cookie = formatCookie(name, '', {
        path: '/',
        maxAge: 0
      });

      res.writeHead(302, {
        'Location': '/',
        'Set-Cookie': cookie
      });
      res.end();
    } else {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Missing name parameter');
    }
  } else if (pathname === '/clear-all') {
    // Delete all cookies
    const cookieHeaders = Object.keys(cookies).map(name =>
      formatCookie(name, '', { path: '/', maxAge: 0 })
    );

    res.writeHead(302, {
      'Location': '/',
      'Set-Cookie': cookieHeaders
    });
    res.end();
  } else if (pathname === '/show-cookies') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      cookies: cookies,
      count: Object.keys(cookies).length,
      raw: req.headers.cookie
    }, null, 2));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

const PORT = 3000;

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/\n`);
  console.log('Try these commands:');
  console.log('  curl -c cookies.txt http://localhost:3000/set-session');
  console.log('  curl -b cookies.txt http://localhost:3000/show-cookies\n');
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  }
});

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.close(() => process.exit(0));
});

/**
 * Key Concepts:
 *
 * 1. Set-Cookie header sends cookies to client
 * 2. Cookie header receives cookies from client
 * 3. HttpOnly prevents JavaScript access (XSS protection)
 * 4. Secure flag requires HTTPS
 * 5. SameSite prevents CSRF attacks
 * 6. Max-Age/Expires control cookie lifetime
 * 7. Path and Domain control cookie scope
 * 8. Delete cookies by setting Max-Age=0
 */
