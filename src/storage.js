const fs = require('fs/promises');
const path = require('path');

const STORAGE_DIR = path.join(__dirname, '..', 'data');
const STORAGE_FILE = path.join(STORAGE_DIR, 'storage.json');

/**
 * Initializes the storage directory if it doesn't exist.
 */
async function initStorage() {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  } catch (err) {
    console.error('Error creating storage directory:', err);
  }
}

/**
 * Loads the stored searchUrl -> lastJobId mappings.
 * @returns {Promise<Object>} The parsed JSON storage object.
 */
async function loadStorage() {
  await initStorage();
  try {
    const data = await fs.readFile(STORAGE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      // File does not exist yet, return empty state
      return {};
    }
    console.error('Error reading storage.json:', err);
    return {};
  }
}

/**
 * Saves the given data to the storage JSON file.
 * @param {Object} data - The storage object to serialize.
 * @returns {Promise<void>}
 */
async function saveStorage(data) {
  await initStorage();
  try {
    await fs.writeFile(STORAGE_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing to storage.json:', err);
  }
}

/**
 * Clears the storage file, browser cache, and screenshot (used by reset command).
 */
async function clearStorage() {
  await initStorage();
  try {
    await fs.writeFile(STORAGE_FILE, '{}', 'utf8');
    
    const browserDataPath = path.join(STORAGE_DIR, 'browser_data');
    await fs.rm(browserDataPath, { recursive: true, force: true });
    
    const screenshotPath = path.join(STORAGE_DIR, 'latest_scrape.png');
    await fs.rm(screenshotPath, { force: true });

    // Try deleting old debug error screenshots in the root if they exist
    const projectRoot = path.join(__dirname, '..');
    const files = await fs.readdir(projectRoot);
    for (const file of files) {
      if (file.startsWith('error_') && file.endsWith('.png')) {
        await fs.rm(path.join(projectRoot, file), { force: true });
      }
    }
    
    console.log('Storage, browser cache, and cached screenshots successfully cleared.');
  } catch (err) {
    console.error('Error clearing storage:', err);
  }
}

module.exports = {
  loadStorage,
  saveStorage,
  clearStorage
};
