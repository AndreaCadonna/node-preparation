/**
 * Exercise 4: Create a File Organizer by Type
 *
 * DIFFICULTY: ⭐⭐ Medium
 * TIME: 20-25 minutes
 *
 * OBJECTIVE:
 * Build a utility that organizes files into folders based on their file type.
 *
 * REQUIREMENTS:
 * 1. Accept a source directory as command-line argument
 * 2. Categorize files by type (documents, images, videos, archives, code, etc.)
 * 3. Create category folders if they don't exist
 * 4. Move or copy files to appropriate folders
 * 5. Handle files with no extension
 * 6. Display summary of organization (files moved, categories created)
 * 7. Add option for dry-run (show what would happen without doing it)
 *
 * FILE CATEGORIES:
 * - documents: .pdf, .doc, .docx, .txt, .md, .rtf
 * - images: .jpg, .jpeg, .png, .gif, .bmp, .svg, .ico
 * - videos: .mp4, .avi, .mkv, .mov, .wmv, .flv
 * - audio: .mp3, .wav, .flac, .aac, .ogg, .m4a
 * - archives: .zip, .rar, .tar, .gz, .7z
 * - code: .js, .py, .java, .cpp, .html, .css, .json
 * - others: everything else
 *
 * BONUS CHALLENGES:
 * - Add --move or --copy flag to choose operation
 * - Support custom category definitions from config file
 * - Add undo functionality (restore original structure)
 * - Handle duplicate filenames (append number)
 * - Add --recursive flag to organize subdirectories
 * - Create a report file with before/after structure
 *
 * HINTS:
 * - Use path.extname() to get file extension
 * - Use fs.rename() for moving files
 * - Use fs.copyFile() for copying files
 * - Check if destination exists before moving
 */

const fs = require('fs').promises;
const path = require('path');

// TODO: Implement your solution here

const FILE_CATEGORIES = {
  documents: ['.pdf', '.doc', '.docx', '.txt', '.md', '.rtf', '.odt'],
  images: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.ico', '.webp'],
  videos: ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm'],
  audio: ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma'],
  archives: ['.zip', '.rar', '.tar', '.gz', '.7z', '.bz2'],
  code: ['.js', '.py', '.java', '.cpp', '.c', '.h', '.html', '.css', '.json', '.xml']
};

async function organizeFiles(sourceDir, options = {}) {
  // Your code here
  // 1. Read all files in directory
  // 2. Categorize each file
  // 3. Create category folders
  // 4. Move/copy files
  // 5. Return summary
}

function categorizeFile(filename) {
  // Your code here
  // Determine which category a file belongs to
}

async function handleDuplicate(destPath) {
  // Your code here
  // If file exists, create unique name (file_1.txt, file_2.txt, etc.)
}

async function main() {
  // Your code here
  // 1. Parse arguments
  // 2. Organize files
  // 3. Display summary
}

// main();

/**
 * TESTING YOUR SOLUTION:
 *
 * 1. Create test directory with mixed files:
 *    mkdir test-organize
 *    touch test-organize/document.pdf
 *    touch test-organize/photo.jpg
 *    touch test-organize/video.mp4
 *    touch test-organize/song.mp3
 *    touch test-organize/archive.zip
 *    touch test-organize/script.js
 *    touch test-organize/noextension
 *
 * 2. Test dry-run:
 *    node exercise-4.js test-organize --dry-run
 *
 * 3. Test actual organization:
 *    node exercise-4.js test-organize
 *
 * 4. Expected output:
 *    Organizing files in: test-organize/
 *
 *    Creating categories:
 *    ✓ documents/
 *    ✓ images/
 *    ✓ videos/
 *    ✓ audio/
 *    ✓ archives/
 *    ✓ code/
 *    ✓ others/
 *
 *    Moving files:
 *    document.pdf → documents/
 *    photo.jpg → images/
 *    video.mp4 → videos/
 *    song.mp3 → audio/
 *    archive.zip → archives/
 *    script.js → code/
 *    noextension → others/
 *
 *    Summary:
 *    ─────────────────────────────
 *    Files organized: 7
 *    Categories created: 7
 *    ─────────────────────────────
 *
 * 5. Verify structure:
 *    tree test-organize
 *    test-organize/
 *    ├── documents/
 *    │   └── document.pdf
 *    ├── images/
 *    │   └── photo.jpg
 *    ├── videos/
 *    │   └── video.mp4
 *    ...
 */

/**
 * EXAMPLE DRY-RUN OUTPUT:
 *
 * DRY RUN MODE - No changes will be made
 * ═══════════════════════════════════════
 *
 * Would create directories:
 *   documents/
 *   images/
 *   videos/
 *   audio/
 *   archives/
 *   code/
 *   others/
 *
 * Would move files:
 *   document.pdf → documents/document.pdf
 *   photo.jpg → images/photo.jpg
 *   video.mp4 → videos/video.mp4
 *   song.mp3 → audio/song.mp3
 *   archive.zip → archives/archive.zip
 *   script.js → code/script.js
 *   noextension → others/noextension
 *
 * Total: 7 files, 7 categories
 */

/**
 * HANDLING DUPLICATES:
 *
 * async function getUniqueFilename(dir, filename) {
 *   const ext = path.extname(filename);
 *   const base = path.basename(filename, ext);
 *   let counter = 1;
 *   let newName = filename;
 *
 *   while (await fileExists(path.join(dir, newName))) {
 *     newName = `${base}_${counter}${ext}`;
 *     counter++;
 *   }
 *
 *   return newName;
 * }
 */

/**
 * LEARNING NOTES:
 *
 * Write down what you learned:
 * - How do you categorize files programmatically?
 * - What's the difference between move and copy?
 * - How do you handle duplicate filenames?
 * - Why is dry-run mode useful?
 */
