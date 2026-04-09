const { connect } = require('puppeteer-real-browser');
const path = require('path');
const config = require('../config.json');
const { loadStorage, saveStorage } = require('./storage');
const { calculateNextInterval, randomDelay, simulateHumanBehavior, delay } = require('./utils');
const { scrapeJobsOnPage, scrapeDeepJobDetails } = require('./scraper');
const { detectNewJobs } = require('./detector');
const { applyCustomFilters, applyDeepFilters, isCountryExcluded } = require('./filter');
const { isLoggedIn, performLogin } = require('./auth');
const { sendJobNotification, sendSystemMessage } = require('./notifier');

/**
 * Initializes and starts the infinite tracking loop.
 */
async function startCrawler()
{
  console.log(`[Crawler] Starting bot... Configuration: headless=${config.headless}`);
  let storageData = await loadStorage();

  const userDataDir = path.join(__dirname, '..', 'data', 'browser_data');
  const fs = require('fs');
  if (!fs.existsSync(userDataDir))
  {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  // Launch browser with persistent context to save cookies, cache, and session.
  const { browser, page } = await connect({
    headless: config.headless,
    turnstile: true, // Let the library auto-solve Cloudflare Turnstile
    customConfig: {
      userDataDir: userDataDir
    }
  });

  // Start with a login check
  if (config.auth && config.auth.enabled) {
      const authenticated = await isLoggedIn(page);
      if (!authenticated) {
          console.log('[Crawler] User not logged in. Initiating login flow...');
          const success = await performLogin(page, config.auth.username, config.auth.password);
          if (!success) {
              console.error('[Crawler] Critical: Login failed. Continuing in guest mode...');
          }
      } else {
          console.log('[Crawler] Session detected. No login required.');
      }
  }

  // Quick startup message (can disable if too spammy)
  await sendSystemMessage(`🟢 Upwork Monitor Started\nWatching ${config.searchUrls.length} search URL(s)`);

  // Infinite loop
  while (true)
  {
    try
    {
      for (const url of config.searchUrls)
      {
        // Strip Cloudflare challenge tokens from the URL to prevent automatic loops
        let cleanUrl = url;
        if (cleanUrl.includes('__cf_chl_tk='))
        {
          cleanUrl = cleanUrl.replace(/([?&])__cf_chl_tk=[^&]+(&|$)/, '$1').replace(/&$/, '');
        }

        console.log(`[Crawler] Navigating to ${cleanUrl}`);

        // Go to search URL and wait loosely to handle dynamic loading
        await page.goto(cleanUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Check for Cloudflare Challenge - usually handled automatically by turnstile:true

        // Let human interaction delay the immediate data grab, wait for lazy loaded elements
        await randomDelay(3, 8);
        await simulateHumanBehavior(page);

        // Take screenshot of the page for debugging/monitoring
        const screenshotPath = path.join(__dirname, '..', 'data', 'latest_scrape.png');
        await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => { });
        console.log(`[Crawler] Saved screenshot to ${screenshotPath}`);

        // Scrape jobs
        const scrapedJobs = await scrapeJobsOnPage(page);
        console.log(`[Crawler] Scraped ${scrapedJobs.length} jobs.`);

        // Detect new jobs
        const { newJobs, updatedStorageData } = detectNewJobs(url, scrapedJobs, storageData);

        const filteredNewJobs = applyCustomFilters(newJobs);

        if (filteredNewJobs.length > 0)
        {
          console.log(`[Crawler] Found ${filteredNewJobs.length} new jobs passing initial filters! Fetching deep details...`);
          for (const job of filteredNewJobs)
          {
            // Human delay before clicking into a job detail page to avoid triggering firewalls
            await randomDelay(3, 6);
            console.log(`[Crawler] Deep crawling Job Details: ${job.url}`);

            try
            {
              await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 45000 });

              await simulateHumanBehavior(page);

              let deepData = await scrapeDeepJobDetails(page);

              if (deepData)
              {
                job.proposals = deepData.proposals !== 'Unknown' ? deepData.proposals : job.proposals;
                job.hireRate = deepData.hireRate;
                job.joinedDate = deepData.joinedDate;
                job.businessType = deepData.businessType;
                job.avgHourlyRate = deepData.avgHourlyRate;
                job.jobsPosted = deepData.jobsPosted;
                job.activeJobs = deepData.activeJobs;
                job.totalHires = deepData.totalHires;

                job.lastViewed = deepData.lastViewed;
                job.interviewing = deepData.interviewing;
                job.invitesSent = deepData.invitesSent;
                job.unansweredInvites = deepData.unansweredInvites;
                job.currentTime = deepData.currentTime;
                job.paymentVerified = deepData.paymentVerified;
                job.phoneVerified = deepData.phoneVerified;
                job.requiredConnects = deepData.requiredConnects;
                job.preferredQualifications = deepData.preferredQualifications;
              }

              // Apply deep filtering logic
              if (!applyDeepFilters(job))
              {
                continue;
              }
            } catch (err)
            {
              console.log(`[Crawler] Warning: Failed to deep scrape job ${job.jobId}: ${err.message}`);
              // If it fails, we keep the job but skip deep filters as we don't have enough data
            }

            await sendJobNotification(job);
            // Wait slightly between telegram messages to avoid API rate limits
            await delay(1500);
          }
        } else
        {
          console.log(`[Crawler] No new jobs detected for this URL.`);
        }

        // Update state in memory and persist it
        storageData = updatedStorageData;
        await saveStorage(storageData);

        // Small random pause before checking the NEXT url in the list
        await randomDelay(2, 5);
      }
    } catch (err)
    {
      console.error(`[Crawler] Error during crawling cycle:`, err.message);
      // Optional: take screenshot on error
      if (config.debug)
      {
        const errorPath = path.join(__dirname, '..', `error_${Date.now()}.png`);
        await page.screenshot({ path: errorPath, fullPage: true }).catch(() => { });
        console.log(`[Crawler] Saved debug screenshot at ${errorPath}`);
      }
    }

    // Determine sleep duration before next overall crawl cycle
    const sleepSeconds = calculateNextInterval(config.baseIntervalSeconds, config.randomFactor);
    console.log(`[Crawler] Cycle finished. Sleeping for ~${sleepSeconds.toFixed(1)} seconds...`);
    await delay(sleepSeconds * 1000);
  }
}

module.exports = {
  startCrawler
};
