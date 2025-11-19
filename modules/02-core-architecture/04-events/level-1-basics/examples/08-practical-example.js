/**
 * Example 8: Practical Example - File Upload System
 *
 * This example demonstrates:
 * - Real-world use of EventEmitter
 * - Combining multiple event patterns
 * - Error handling
 * - Progress tracking
 * - Lifecycle events
 * - Best practices in action
 */

const EventEmitter = require('events');

console.log('=== Practical Example: File Upload System ===\n');

/**
 * FileUploader - Simulates file upload with events
 */
class FileUploader extends EventEmitter {
  constructor() {
    super();
    this.uploads = new Map();
  }

  upload(file) {
    // Validate file
    if (!file || !file.name) {
      this.emit('error', new Error('Invalid file'));
      return null;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB max
      this.emit('error', new Error('File too large'));
      return null;
    }

    // Create upload session
    const uploadId = `upload-${Date.now()}`;
    const upload = {
      id: uploadId,
      file,
      progress: 0,
      status: 'pending'
    };

    this.uploads.set(uploadId, upload);
    this.emit('upload:started', upload);

    // Start upload simulation
    this._simulateUpload(upload);

    return uploadId;
  }

  _simulateUpload(upload) {
    const chunks = 10;
    const chunkSize = upload.file.size / chunks;
    let uploaded = 0;

    upload.status = 'uploading';
    this.emit('upload:progress', {
      id: upload.id,
      progress: 0,
      uploaded: 0,
      total: upload.file.size
    });

    const interval = setInterval(() => {
      uploaded += chunkSize;
      upload.progress = Math.min(Math.round((uploaded / upload.file.size) * 100), 100);

      this.emit('upload:progress', {
        id: upload.id,
        progress: upload.progress,
        uploaded: Math.min(uploaded, upload.file.size),
        total: upload.file.size
      });

      // Random error simulation (5% chance)
      if (Math.random() < 0.05) {
        clearInterval(interval);
        upload.status = 'failed';
        this.emit('upload:failed', {
          id: upload.id,
          error: new Error('Network error'),
          progress: upload.progress
        });
        return;
      }

      // Upload complete
      if (uploaded >= upload.file.size) {
        clearInterval(interval);
        upload.status = 'completed';
        upload.progress = 100;

        this.emit('upload:completed', {
          id: upload.id,
          file: upload.file,
          url: `https://example.com/files/${upload.file.name}`
        });
      }
    }, 100);
  }

  cancelUpload(uploadId) {
    const upload = this.uploads.get(uploadId);

    if (!upload) {
      this.emit('error', new Error('Upload not found'));
      return false;
    }

    if (upload.status === 'completed') {
      this.emit('error', new Error('Cannot cancel completed upload'));
      return false;
    }

    upload.status = 'cancelled';
    this.emit('upload:cancelled', {
      id: uploadId,
      progress: upload.progress
    });

    this.uploads.delete(uploadId);
    return true;
  }

  getUploadStatus(uploadId) {
    return this.uploads.get(uploadId);
  }
}

/**
 * UploadManager - Manages multiple uploads with UI updates
 */
class UploadManager {
  constructor(uploader) {
    this.uploader = uploader;
    this.setupListeners();
  }

  setupListeners() {
    // Track when uploads start
    this.uploader.on('upload:started', (upload) => {
      console.log(`[Start] Uploading "${upload.file.name}" (${this.formatBytes(upload.file.size)})`);
    });

    // Show progress
    this.uploader.on('upload:progress', (data) => {
      const bar = this.createProgressBar(data.progress);
      process.stdout.write(`\r[Progress] ${bar} ${data.progress}% (${this.formatBytes(data.uploaded)}/${this.formatBytes(data.total)})`);

      if (data.progress === 100) {
        console.log(''); // New line
      }
    });

    // Handle completion
    this.uploader.on('upload:completed', (data) => {
      console.log(`[Complete] File available at: ${data.url}`);
    });

    // Handle failures
    this.uploader.on('upload:failed', (data) => {
      console.log(`\n[Failed] Upload failed at ${data.progress}%: ${data.error.message}`);
    });

    // Handle cancellation
    this.uploader.on('upload:cancelled', (data) => {
      console.log(`[Cancelled] Upload cancelled at ${data.progress}%`);
    });

    // Handle errors
    this.uploader.on('error', (err) => {
      console.log(`[Error] ${err.message}`);
    });
  }

  createProgressBar(percent) {
    const length = 20;
    const filled = Math.round(length * percent / 100);
    const empty = length - filled;
    return '[' + '='.repeat(filled) + ' '.repeat(empty) + ']';
  }

  formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}

/**
 * Analytics - Track upload metrics
 */
class UploadAnalytics {
  constructor(uploader) {
    this.uploader = uploader;
    this.stats = {
      started: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      totalBytes: 0,
      completedBytes: 0
    };

    this.setupListeners();
  }

  setupListeners() {
    this.uploader.on('upload:started', (upload) => {
      this.stats.started++;
      this.stats.totalBytes += upload.file.size;
    });

    this.uploader.on('upload:completed', (data) => {
      this.stats.completed++;
      this.stats.completedBytes += data.file.size;
    });

    this.uploader.on('upload:failed', () => {
      this.stats.failed++;
    });

    this.uploader.on('upload:cancelled', () => {
      this.stats.cancelled++;
    });
  }

  printStats() {
    console.log('\n=== Upload Statistics ===');
    console.log('Started:', this.stats.started);
    console.log('Completed:', this.stats.completed);
    console.log('Failed:', this.stats.failed);
    console.log('Cancelled:', this.stats.cancelled);
    console.log('Success Rate:', this.stats.started > 0 ?
      `${Math.round(this.stats.completed / this.stats.started * 100)}%` : 'N/A');
    console.log('Total Data:', this.formatBytes(this.stats.totalBytes));
    console.log('Uploaded Data:', this.formatBytes(this.stats.completedBytes));
  }

  formatBytes(bytes) {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}

// Create the system
const uploader = new FileUploader();
const manager = new UploadManager(uploader);
const analytics = new UploadAnalytics(uploader);

// Simulate file uploads
console.log('Starting file uploads...\n');

// Upload 1: Small file (should succeed)
uploader.upload({
  name: 'document.pdf',
  size: 1024 * 500 // 500 KB
});

// Wait a bit, then upload more files
setTimeout(() => {
  console.log('\n');

  // Upload 2: Medium file (might succeed or fail)
  uploader.upload({
    name: 'image.jpg',
    size: 1024 * 1024 * 2 // 2 MB
  });
}, 1500);

setTimeout(() => {
  console.log('\n');

  // Upload 3: Large file (might succeed or fail)
  uploader.upload({
    name: 'video.mp4',
    size: 1024 * 1024 * 5 // 5 MB
  });
}, 3000);

setTimeout(() => {
  console.log('\n');

  // Upload 4: File too large (should error)
  uploader.upload({
    name: 'huge-file.zip',
    size: 1024 * 1024 * 20 // 20 MB - too large
  });
}, 4500);

// Print final statistics
setTimeout(() => {
  analytics.printStats();
  console.log('\n=== Example Complete ===');
}, 6000);

/*
 * Key Takeaways:
 * 1. Events make complex systems more manageable and decoupled
 * 2. Multiple listeners can observe the same events for different purposes
 * 3. Progress tracking is natural with events
 * 4. Error handling is centralized and consistent
 * 5. Easy to add new features (like analytics) without changing core code
 * 6. Events provide excellent debugging and monitoring hooks
 * 7. Lifecycle events (start, progress, complete, fail, cancel) are a common pattern
 * 8. Real-world applications use EventEmitter extensively for flexibility
 */
