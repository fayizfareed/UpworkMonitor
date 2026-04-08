# Upwork Job Monitor Bot - Walkthrough

The development of the robust Node.js Playwright bot for monitoring Upwork job feeds is fully complete!

## 🌟 What was Accomplished?

I have built a highly modular, headless (or headful, configurable via `config.json`) Node.js bot utilizing `playwright-extra` and `puppeteer-extra-plugin-stealth` to bypass basic bot detections that Upwork employs.

### Core Features Emplemented:
1. **Human Behaviour Simulation**
   - Incorporates random delays between actions (e.g., waiting 2-7 seconds between parsing operations).
   - Simulates random mouse movements, clicking coordinates, scroll directions (both micro intervals and larger continuous scrolls) via Playwright's `mouse` API.
   - Includes long calculated breaks (10-30s pauses mimicking a tab switch/reading) with 15% random occurrence intervals.
2. **Persistent Browser Contexts**
   - Generates a local cache directory (`/data/browser_data`) when initialized. This ensures login sessions or stored cookies persist across restarts, so Upwork remembers your device signature.
3. **Advanced Detection Algorithm**
   - The bot caches the *most recent* job ID to `<project_root>/data/storage.json`. 
   - On following cycles, it parses from the top down. If it hits an already known Job ID, it halts tracking for that URL and pushes any newly discovered jobs to Telegram incrementally.
4. **Resilient Error Tolerances**
   - Built to skip cycles and loop continuously (`while(true)`) with generic `catch` blocks wrapping navigations.
   - Global node unhandled rejection hooks prevent silent process failures.
   - If UI structure changes entirely and DOM extraction gets zero results, it intelligently yields empty instead of crashing.
5. **Telegram Integration**
   - Neatly formatted HTML push notifications grouping the Job Title, Budget, Proposals, and direct URL connection.

## 📁 Final Build Map

```plaintext
/Volumes/FM/ProjectFinding/Tools/UpworkMonitor
├── .env                  // Setup: Fill TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID
├── config.json           // Setup: Tweak headless options and searchURLs list
├── index.js              // Main execution harness
├── package.json
├── data/                 // (Auto-generated)
│   ├── storage.json      // Single lightweight state marker
│   └── browser_data/     // Chromium profile directory
└── src/                  // All Logic Systems ⬇️
    ├── crawler.js        // The looping driver
    ├── detector.js       // Diffs current fetched view with storage
    ├── notifier.js       // Pushes payload via HTTP to Telegram
    ├── scraper.js        // DOM Evaluation + Regex cleanup
    ├── storage.js        // Disk Read/Write handlers
    └── utils.js          // Human emulation calculators
```

## 🚀 How setup & Execution works

1. Open `.env` and assign your actual **Telegram variables**.
   ```env
   TELEGRAM_BOT_TOKEN=123456789:ABCdefgGHI_jklMNO
   TELEGRAM_CHAT_ID=12345678
   ```
2. By default, it's configured for the public search: `https://www.upwork.com/nx/search/jobs/?q=react%20native` inside `config.json`. Swap this out as necessary.
3. **Optional First Run:** You might want to switch `"headless": false` in `config.json`, run `node index.js`, let Chromium open, manually log into your generic/client Upwork account via the UI, wait for the first cycle to pass, then `Ctrl+C`. Change it back to `"headless": true` and run `npm start`. It will now have an authenticated session persistent locally forever.
4. Boot the script natively or under a PM2 process manager:
   ```bash
   node index.js
   ```

### 🎁 Bonus Built-in
If you ever want to wipe out the tracker completely and reset the top loaded Job IDs (e.g. if you tweaked search URL parameters heavily):
```bash
node index.js --reset
```
