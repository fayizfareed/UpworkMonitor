/**
 * Extracts job listings from the current Upwork search results page.
 * @param {import('puppeteer').Page} page
 * @returns {Promise<Array>} Array of job objects
 */
async function scrapeJobsOnPage(page) {
  // Wait for at least the article cards to show up. 
  // We use catching mechanism so we don't crash if it takes up to some timeout or page is empty (like a "No results" page)
  try {
    await page.waitForSelector('article[data-ev-job-uid], section.up-card-section', { timeout: 10000 });
  } catch (err) {
    console.log('[Scraper] Wait timeout for job cards. It might be zero results or different markup.');
  }

  // Execute DOM scraping
  const jobs = await page.evaluate(() => {
    // Upwork changes selectors occasionally. Typically jobs are sections or articles with data attributes.
    // Let's try to find generic job wrapper candidates.
    const wrappers = Array.from(document.querySelectorAll('article[data-ev-job-uid], section.up-card-section'));
    const results = [];

    for (let i = 0; i < wrappers.length; i++) {
      const el = wrappers[i];
      
      // 1. Job ID
      let jobId = el.getAttribute('data-ev-job-uid');
      let titleEl = el.querySelector('h2 a, h3 a');
      let url = '';
      if (titleEl) {
        let href = titleEl.getAttribute('href');
        if (href) {
          // If no UID is on the wrapper, we might try to infer from url
          if (!jobId) {
            const match = href.match(/~([0-9a-zA-Z]+)/);
            if (match) jobId = '~' + match[1];
          }
          if (href.startsWith('/')) {
            url = 'https://www.upwork.com' + href;
          } else {
            url = href;
          }
        }
      }

      // If we still can't find an ID or URL, skip
      if (!jobId || !url) continue;

      // 2. Title
      let title = titleEl ? titleEl.innerText.trim() : 'Unknown Title';

      // Job Data enhancements using flattened text and priority selectors
      const textNodes = el.innerText || '';
      const inlineText = textNodes.replace(/\n/g, ' ');

      // 3. Type & Budget
      let type = 'Unknown';
      const jobTypeEl = el.querySelector('[data-test="job-type"]');
      if (jobTypeEl) {
         type = jobTypeEl.innerText.trim();
      } else {
         if (/Hourly/i.test(inlineText)) type = 'Hourly';
         else if (/Fixed[-\s]price/i.test(inlineText)) type = 'Fixed-price';
      }

      let budget = 'Not Specified';
      const budgetMatch = inlineText.match(/(\$[0-9,.]+(?:\+)?(?:\s*-\s*\$[0-9,.]+)?(?: \/ hr)?)/i);
      if (budgetMatch) {
         budget = budgetMatch[1];
      }

      // 4. Proposals
      let proposals = 'Unknown';
      const propTierEl = el.querySelector('[data-test="proposals-tier"], [data-test="proposals"]');
      if (propTierEl) {
         proposals = propTierEl.innerText.trim();
      } else {
         const pMatch = inlineText.match(/Proposals:?\s*(Less than \d+|\d+ to \d+|\d+\+|\d+)/i);
         if (pMatch) proposals = pMatch[1];
      }

      // 5. Location
      let location = 'Unknown';
      const locEl = el.querySelector('[data-test="client-country"], [data-test="client-location"], [data-test="location"]');
      if (locEl) {
         location = locEl.innerText.trim();
      } else {
         // Upwork often places country at the end, but without a selector it's risky to guess. We'll leave as Unknown if not matched.
      }

      // 5. Description (heuristics: look for specific data-test, classes, or get the longest text block)
      let description = '';
      const descEl = el.querySelector('[data-test="job-description-text"], [data-test="UpCLineClamp"], .up-line-clamp-v2, .job-description-text');
      if (descEl) {
        description = descEl.innerText.trim();
      } else {
        // Fallback: finding the longest paragraph or span text within the card
        let longestText = '';
        const allTextContainers = el.querySelectorAll('div, span, p');
        for (const container of allTextContainers) {
          // Avoid the root node itself and nodes with too much child depth
          if (container.children.length === 0 || container.tagName === 'P') {
            const text = container.innerText.trim();
            if (text.length > longestText.length && text.length < 1500) {
              longestText = text;
            }
          }
        }
        description = longestText || 'No description extracted.';
      }

      // Truncate description if it's too long
      if (description.length > 300) {
        description = description.substring(0, 300) + '...';
      }

      results.push({ jobId, title, url, type, budget, proposals, location, description });
    }

    return results;
  });

  return jobs;
}

/**
 * Parses the dedicated Job Details page to extract the precise country of the client and other metrics.
 * @param {import('puppeteer').Page} page
 * @returns {Promise<Object>} Object containing deep job details
 */
async function scrapeDeepJobDetails(page) {
  try {
    // Wait for at least some client history to load, but don't fail immediately if it isn't there
    await page.waitForSelector('[data-qa="client-location"], .client-about-box, [data-qa="client-info"]', { timeout: 8000 });
  } catch (err) {
    console.log('[Scraper] Deep Location timeout. Relying on generic extraction.');
  }

  const deepData = await page.evaluate(() => {
    let location = 'Unknown';
    let proposals = 'Unknown';
    let hireRate = 'Unknown';
    let joinedDate = 'Unknown';
    let businessType = 'Unknown';
    let avgHourlyRate = 'Unknown';
    let jobsPosted = 'Unknown';
    let activeJobs = 'Unknown';
    let totalHires = 'Unknown';

    // 1. Location
    const locEl = document.querySelector('[data-qa="client-location"] strong, [data-test="client-country"], [data-ui-cmp="client-location"]');
    if (locEl) {
      location = locEl.innerText.trim();
    } else {
      // Fallback
      const clientBox = document.querySelector('[data-qa="client-info"], [data-test="client-info"]');
      if (clientBox) {
        const lis = clientBox.querySelectorAll('ul li');
        for (const li of lis) {
          if (li.innerText && li.innerText.length < 50 && !li.innerText.toLowerCase().includes('member since')) {
             const s = li.querySelector('strong');
             if (s) location = s.innerText.trim();
          }
        }
      }
    }

    // 2. Scan entire document body text for reliable heuristics since Upwork changes tags frequently
    const bodyText = document.body.innerText || '';

    // Proposals
    const pMatch = bodyText.match(/Proposals:[ \t]*([^\n]+)/i);
    if (pMatch) proposals = pMatch[1].trim();

    // Client Info Heuristics
    const memberMatch = bodyText.match(/Member since (.+)/i);
    if (memberMatch) joinedDate = memberMatch[1].trim();

    const hireRateMatch = bodyText.match(/(\d+%)\s*hire rate/i);
    if (hireRateMatch) hireRate = hireRateMatch[1];

    const bizMatch = bodyText.match(/(Small business|Large company|Mid-sized company)[^\n]*/i);
    if (bizMatch) businessType = bizMatch[0].trim();

    const avgMatch = bodyText.match(/(\$[0-9,.]+(?:\/hr)?)\s*avg hourly rate/i);
    if (avgMatch) avgHourlyRate = avgMatch[1];

    const postedMatch = bodyText.match(/(\d+)\s*jobs posted/i);
    if (postedMatch) jobsPosted = postedMatch[1];

    const openMatch = bodyText.match(/(\d+)\s*(open|active)\s*job/i);
    if (openMatch) activeJobs = openMatch[1];

    const hiresMatch = bodyText.match(/(?:Total hires\s*)?(\d+)\s*hire/i);
    if (hiresMatch) totalHires = hiresMatch[1];

    return {
      location,
      proposals,
      hireRate,
      joinedDate,
      businessType,
      avgHourlyRate,
      jobsPosted,
      activeJobs,
      totalHires
    };
  });

  return deepData;
}

module.exports = {
  scrapeJobsOnPage,
  scrapeDeepJobDetails
};
