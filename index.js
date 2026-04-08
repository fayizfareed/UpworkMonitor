require('dotenv').config();
const { startCrawler } = require('./src/crawler');
const { clearStorage } = require('./src/storage');

async function main() {
  // Bonus: Add CLI command to reset stored job IDs
  const args = process.argv.slice(2);
  
  if (args.includes('--reset') || args.includes('reset')) {
    console.log('Resetting storage...');
    await clearStorage();
    console.log('Storage reset complete. Exiting.');
    process.exit(0);
  }

  // Start the background crawler
  try {
    await startCrawler();
  } catch (err) {
    console.error('Fatal error in main process:', err);
    process.exit(1);
  }
}

// Global unhandled rejection handler to avoid silent crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Avoid app crashing down immediately on exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
});

main();
