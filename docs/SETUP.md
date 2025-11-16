# Development Environment Setup

This guide will help you set up your development environment for the Node.js Core Modules course.

## Prerequisites

### Required Software

#### 1. Node.js (v18+ recommended)

**Check if installed:**
```bash
node --version
npm --version
```

**Installation:**

**macOS:**
```bash
# Using Homebrew
brew install node

# Or download from nodejs.org
```

**Windows:**
- Download installer from [nodejs.org](https://nodejs.org/)
- Or use [nvm-windows](https://github.com/coreybutler/nvm-windows)

**Linux:**
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

#### 2. Text Editor/IDE

**Recommended: Visual Studio Code**
- Download from [code.visualstudio.com](https://code.visualstudio.com/)
- Free, powerful, excellent Node.js support

**VS Code Extensions (Recommended):**
- **ESLint** - JavaScript linting
- **Prettier** - Code formatting
- **Node.js Extension Pack** - Comprehensive Node.js tools
- **Path Intellisense** - File path autocomplete
- **Error Lens** - Inline error highlighting
- **REST Client** - Test HTTP requests

**Alternative IDEs:**
- WebStorm (paid, very powerful)
- Sublime Text
- Vim/Neovim (for advanced users)

#### 3. Git

**Check if installed:**
```bash
git --version
```

**Installation:**
- **macOS**: `brew install git` or comes with Xcode
- **Windows**: [git-scm.com](https://git-scm.com/)
- **Linux**: `sudo apt-get install git`

**Configuration:**
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

---

## Optional but Recommended

### 1. Node Version Manager (nvm)

Allows you to easily switch between Node.js versions.

**Installation:**
```bash
# macOS/Linux
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Windows
# Download nvm-windows from GitHub
```

**Usage:**
```bash
nvm install 18        # Install Node.js 18
nvm install 20        # Install Node.js 20
nvm use 18            # Switch to Node.js 18
nvm list             # List installed versions
```

### 2. Terminal Enhancements

**macOS/Linux:**
- **iTerm2** (macOS) - Better terminal
- **Oh My Zsh** - Shell enhancement
- **tmux** - Terminal multiplexer

**Windows:**
- **Windows Terminal** - Modern terminal
- **Git Bash** - Unix-like terminal
- **WSL2** - Linux subsystem

### 3. Additional Tools

```bash
# nodemon - Auto-restart on file changes
npm install -g nodemon

# npm-check-updates - Update dependencies
npm install -g npm-check-updates

# http-server - Quick static file server
npm install -g http-server
```

---

## Project Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd node-preparation
```

### 2. Verify Node.js Installation

```bash
node --version  # Should be v18.0.0 or higher
npm --version   # Should be 8.0.0 or higher
```

### 3. Create Your Working Directory

```bash
# Create a directory for your practice code
mkdir my-solutions
cd my-solutions
npm init -y
```

### 4. Install Development Dependencies (Optional)

```bash
# ESLint for code quality
npm install --save-dev eslint

# Initialize ESLint
npx eslint --init

# Prettier for code formatting
npm install --save-dev prettier

# Nodemon for auto-restart
npm install --save-dev nodemon
```

---

## Editor Configuration

### VS Code Settings

Create `.vscode/settings.json` in your project:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.autoSave": "onFocusChange",
  "javascript.updateImportsOnFileMove.enabled": "always",
  "editor.tabSize": 2,
  "files.insertFinalNewline": true,
  "files.trimTrailingWhitespace": true
}
```

### Prettier Configuration

Create `.prettierrc`:

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80,
  "arrowParens": "always"
}
```

### ESLint Configuration

Create `.eslintrc.json`:

```json
{
  "env": {
    "node": true,
    "es2021": true
  },
  "extends": "eslint:recommended",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "rules": {
    "no-console": "off",
    "no-unused-vars": "warn"
  }
}
```

---

## Debugging Setup

### VS Code Debugging

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Program",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/${relativeFile}"
    },
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to Process",
      "port": 9229
    }
  ]
}
```

### Chrome DevTools

Run Node.js with inspect flag:
```bash
node --inspect yourfile.js
# Then open chrome://inspect in Chrome
```

### Built-in Debugger

```bash
node inspect yourfile.js
```

**Commands:**
- `cont` or `c` - Continue execution
- `next` or `n` - Step to next line
- `step` or `s` - Step into function
- `out` or `o` - Step out of function
- `repl` - Enter REPL mode

---

## Testing Your Setup

### 1. Create a Test File

Create `test-setup.js`:

```javascript
// Test basic Node.js
console.log('Node.js version:', process.version);
console.log('Platform:', process.platform);

// Test async/await
async function testAsync() {
  return new Promise((resolve) => {
    setTimeout(() => resolve('Async works!'), 100);
  });
}

testAsync().then(console.log);

// Test ES6 modules
const fs = require('fs');
console.log('File system module loaded:', typeof fs.readFile);

// Test core modules
const path = require('path');
const os = require('os');
console.log('Current directory:', path.resolve('./'));
console.log('CPU cores:', os.cpus().length);

console.log('\n✅ Setup complete! You are ready to start the course.');
```

### 2. Run the Test

```bash
node test-setup.js
```

**Expected output:**
```
Node.js version: v18.x.x
Platform: darwin/linux/win32
Async works!
File system module loaded: function
Current directory: /path/to/your/directory
CPU cores: 4
✅ Setup complete! You are ready to start the course.
```

---

## Package.json Scripts

Add useful scripts to your `package.json`:

```json
{
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "test": "node --test",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write ."
  }
}
```

**Usage:**
```bash
npm start       # Run your application
npm run dev     # Run with auto-reload
npm test        # Run tests
npm run lint    # Check code quality
npm run format  # Format code
```

---

## Working with the Course

### Directory Structure

Organize your solutions like this:

```
my-solutions/
├── module-01-fs/
│   ├── level-1/
│   │   ├── exercise-1.js
│   │   ├── exercise-2.js
│   │   └── ...
│   ├── level-2/
│   └── level-3/
├── module-02-path/
└── ...
```

### Running Examples

```bash
# Navigate to exercise directory
cd my-solutions/module-01-fs/level-1

# Run your solution
node exercise-1.js

# Or use nodemon for auto-reload
nodemon exercise-1.js
```

---

## Troubleshooting

### Common Issues

#### 1. Node.js not found
```bash
# Check PATH
echo $PATH  # macOS/Linux
echo %PATH%  # Windows

# Reinstall Node.js or use nvm
```

#### 2. Permission errors (Linux/macOS)
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

#### 3. Old Node.js version
```bash
# Update using nvm
nvm install --lts
nvm use --lts

# Or reinstall Node.js
```

#### 4. Module not found errors
```bash
# Make sure you're in the right directory
pwd  # Check current directory

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

---

## Performance Tips

### 1. Use Node.js built-in test runner (Node 18+)
```javascript
// test.js
const assert = require('assert');
const test = require('node:test');

test('basic test', () => {
  assert.strictEqual(1 + 1, 2);
});
```

```bash
node --test
```

### 2. Profile your code
```bash
# Generate CPU profile
node --prof app.js

# Process the profile
node --prof-process isolate-*.log > profile.txt
```

### 3. Memory profiling
```bash
# Track memory usage
node --trace-warnings --trace-deprecation app.js

# Heap snapshot
node --inspect app.js
# Then use Chrome DevTools to capture heap snapshot
```

---

## Quick Reference

### Essential Commands
```bash
# Node.js
node file.js              # Run a file
node                      # Start REPL
node --version            # Check version
node --help               # Get help

# NPM
npm init                  # Initialize project
npm install <package>     # Install package
npm install -g <package>  # Install globally
npm update                # Update packages
npm list                  # List installed packages

# Debugging
node --inspect file.js    # Enable debugging
node --inspect-brk file.js # Break on first line
```

### Keyboard Shortcuts (VS Code)
- `Ctrl/Cmd + \`` - Toggle terminal
- `F5` - Start debugging
- `F9` - Toggle breakpoint
- `F10` - Step over
- `F11` - Step into
- `Shift + F11` - Step out
- `Ctrl/Cmd + Shift + P` - Command palette

---

## Next Steps

1. ✅ Verify all software is installed correctly
2. ✅ Run the test setup script
3. ✅ Configure your editor
4. ✅ Create your working directory
5. 📚 Start with [Module 1: File System](../modules/01-fundamentals/01-fs/README.md)

---

## Getting Help

If you encounter setup issues:

1. Check the troubleshooting section above
2. Review Node.js documentation: https://nodejs.org/docs
3. Search for error messages online
4. Check Node.js GitHub issues
5. Ask in Node.js communities (Discord, Stack Overflow)

---

**Setup complete?** Head to the [Learning Path](LEARNING_PATH.md) to start learning!
