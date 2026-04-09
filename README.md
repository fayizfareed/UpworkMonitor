# Upwork Job Monitor Bot

A production-ready, stealthy automation tool designed to monitor Upwork for new job postings in real-time. It uses advanced filtering, performs deep scraping of client metrics, and sends instant notifications to Telegram.

## 🚀 Features

- **Real-Time Monitoring**: Scans multiple Upwork search URLs at configurable intervals.
- **Stealth Protection**: Built on `puppeteer-real-browser` to bypass anti-bot protections (Cloudflare/Turnstile).
- **Human-Like Behavior**: Simulates natural scrolling, mouse movements, and variable delays.
- **Deep Data Extraction**: Extracts granular details from individual job pages:
    - **Connects Required**: Auto-detects the exact number of connects needed.
    - **Client Metrics**: Joined date, Hire rate, Job posted count, Total spent, and Average hourly rate paid.
    - **Activity Details**: Last viewed by client, Interviewing count, Invites sent, and Unanswered invites.
    - **Qualifications**: Preferred qualifications with ✅/🔴 visual indicators for success/failure.
- **Advanced Multi-Stage Filtering**:
    - **Initial Filters**: Budget (Fixed/Hourly), Proposals count, Client Rating, Country, and Keyword exclusion.
    - **Deep Filters**: Hire Rate (with special rules for new clients), Invitation capacity, Interviewing limits, and Business Type exclusions.
- **Schedule-Based Intervals**: Automatically adjusts scraping frequency based on the time of day (e.g., faster during peak hours).
- **Robust Auth**: Handles persistent sessions and automated login with retry logic and manual MFA support.
- **Telegram Integration**: Richly formatted notifications with action links straight to the job page.

## 🛠 Prerequisites

- **Node.js**: v16 or higher recommended.
- **Telegram Bot**: A bot token and your Chat ID (use `@userinfobot` to find yours).
- **Upwork Account**: For authenticated deep scraping.

## 📦 Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd UpworkMonitor
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```env
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   TELEGRAM_CHAT_ID=your_chat_id_here
   ```

4. Configure your search URLs and filters in `config.json`.

## ⚙️ Configuration (`config.json`)

The `config.json` file is the heart of the bot. Key sections include:

- **`searchUrls`**: Array of Upwork search result URLs.
- **`schedules`**: Define time windows (HH:mm) and intervals (minutes).
- **`filters`**:
    - `minFixedPrice` / `minHourlyRate`: Set your minimum budget limits.
    - `minHireRate`: Skip clients with low hire rates (e.g., `< 90%`).
    - `maxInvitesSent`: Skip jobs where the client has already sent too many invites.
    - `maxInterviewing`: Skip jobs where the client is already interviewing too many people.
    - `excludeBusinessTypes`: Skip specific client types (e.g., "Tech & IT").
    - `excludeKeywords`: Array of words to filter out from job titles.
    - `excludeCountries`: List of countries to ignore.

## 🏃 Usage

Start the monitor:
```bash
node index.js
```

### Maintenance Commands

Reset the bot (clears seen jobs, browser cache, and session):
```bash
node index.js --reset
```

## 📂 Project Structure

- `src/crawler.js`: Orchestrates the navigation and loop cycles.
- `src/scraper.js`: Logic for parsing job data from the DOM.
- `src/filter.js`: Handles complex multi-stage filtering logic.
- `src/notifier.js`: Formats and sends Telegram messages.
- `src/utils.js`: Helpers for human behavior, scheduling, and delays.
- `src/auth.js`: Manages login flows and session persistence.
- `data/storage.json`: Locally persists "seen" job IDs to avoid duplicate notifications.

## ⚠️ Disclaimer

This tool is for educational purposes only. Automated scraping of Upwork may violate their Terms of Service. Use responsibly and at your own risk.
