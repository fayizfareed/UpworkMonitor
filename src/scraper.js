/**
 * Extracts job listings from the current Upwork search results page.
 * @param {import('puppeteer').Page} page
 * @returns {Promise<Array>} Array of job objects
 */
async function scrapeJobsOnPage(page)
{
  // Wait for at least the article cards to show up. 
  // We use catching mechanism so we don't crash if it takes up to some timeout or page is empty (like a "No results" page)
  try
  {
    await page.waitForSelector('article[data-ev-job-uid], section.up-card-section', { timeout: 10000 });
  } catch (err)
  {
    console.log('[Scraper] Wait timeout for job cards. It might be zero results or different markup.');
  }

  // Execute DOM scraping
  const jobs = await page.evaluate(() =>
  {
    // Upwork changes selectors occasionally. Typically jobs are sections or articles with data attributes.
    // Let's try to find generic job wrapper candidates.
    const wrappers = Array.from(document.querySelectorAll('article[data-ev-job-uid], section.up-card-section'));
    const results = [];

    for (let i = 0; i < wrappers.length; i++)
    {
      const el = wrappers[i];

      // 1. Job ID
      let jobId = el.getAttribute('data-ev-job-uid');
      let titleEl = el.querySelector('h2 a, h3 a');
      let url = '';
      if (titleEl)
      {
        let href = titleEl.getAttribute('href');
        if (href)
        {
          // If no UID is on the wrapper, we might try to infer from url
          if (!jobId)
          {
            const match = href.match(/~([0-9a-zA-Z]+)/);
            if (match) jobId = '~' + match[1];
          }
          if (href.startsWith('/'))
          {
            url = 'https://www.upwork.com' + href;
          } else
          {
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
      let budget = 'Not Specified';

      // Use the explicit job-type-label from the logged-in HTML format
      const jobTypeLabelEl = el.querySelector('[data-test="job-type-label"], [data-test="job-type"]');
      if (jobTypeLabelEl)
      {
        let fullText = jobTypeLabelEl.innerText.trim().replace(/\n/g, ' ');
        if (/Hourly/i.test(fullText))
        {
          type = 'Hourly';
          // Extract the budget part after "Hourly: "
          const hMatch = fullText.match(/Hourly:?\s*(.*)/i);
          if (hMatch)
          {
            budget = hMatch[1].trim();
          } else
          {
            const bMatch = fullText.match(/(\$[0-9,.]+[kKmM]?(?:\+)?(?:\s*-\s*\$[0-9,.]+[kKmM]?)?)/i);
            if (bMatch) budget = bMatch[1].trim();
          }
        } else if (/Fixed[-\s]price/i.test(fullText))
        {
          type = 'Fixed-price';
          const bMatch = fullText.match(/(\$[0-9,.]+[kKmM]?(?:\+)?(?:\s*-\s*\$[0-9,.]+[kKmM]?)?)/i);
          if (bMatch) budget = bMatch[1].trim();
        }
      } else
      {
        // Fallback logic for unauthenticated or alternative views
        if (/Hourly/i.test(inlineText)) type = 'Hourly';
        else if (/Fixed[-\s]price/i.test(inlineText)) type = 'Fixed-price';

        const budgetMatch = inlineText.match(/(\$[0-9,.]+[kKmM]?(?:\+)?(?:\s*-\s*\$[0-9,.]+[kKmM]?)?(?: \/ hr)?)/i);
        if (budgetMatch)
        {
          budget = budgetMatch[1].trim();
        }
      }

      // If budget was not inside the job-type-label (which happens with Fixed price logged-in jobs)
      if (budget === 'Not Specified' || !budget)
      {
        const explicitBudgetEl = el.querySelector('[data-test="is-fixed-price"], [data-test="budget"], [data-test="duration"]');
        if (explicitBudgetEl)
        {
          const bMatch = explicitBudgetEl.innerText.match(/(\$[0-9,.]+[kKmM]?(?:\+)?(?:\s*-\s*\$[0-9,.]+[kKmM]?)?)/i);
          if (bMatch) budget = bMatch[1].trim();
        }
      }

      // 4. Proposals
      let proposals = 'Unknown';
      const propTierEl = el.querySelector('[data-test="proposals-tier"], [data-test="proposals"]');
      if (propTierEl)
      {
        proposals = propTierEl.innerText.replace(/^Proposals:?\s*/i, '').trim();
      } else
      {
        const pMatch = inlineText.match(/Proposals:?\s*(Less than \d+|\d+ to \d+|\d+\+|\d+)/i);
        if (pMatch) proposals = pMatch[1].trim();
      }

      // 5. Location
      let location = 'Unknown';
      const locEl = el.querySelector('[data-test="client-country"], [data-test="client-location"], [data-test="location"]');
      if (locEl)
      {
        let rawLocation = locEl.innerText.trim();
        // If the inner text contains something like "Location\nAustralia", extract just the country
        const parts = rawLocation.split('\n');
        location = parts[parts.length - 1].trim();
      } else
      {
        // Upwork often places country at the end, but without a selector it's risky to guess. We'll leave as Unknown if not matched.
      }

      // 6. Payment Verified
      let paymentVerified = '❌';
      const paymentEl = el.querySelector('[data-test="payment-verification-status"]');
      if (paymentEl)
      {
        if (/verified/i.test(paymentEl.innerText) && !/unverified/i.test(paymentEl.innerText))
        {
          paymentVerified = '✅';
        }
      } else if (/payment(?: method)? verified/i.test(inlineText))
      {
        paymentVerified = '✅';
      }

      // 7. Rating
      let rating = 0;
      const ratingEl = el.querySelector('.air3-rating-value-text');
      if (ratingEl)
      {
        rating = parseFloat(ratingEl.innerText.trim()) || 0;
      }

      // 8. Description (heuristics: look for specific data-test, classes, or get the longest text block)
      let description = '';
      const descEl = el.querySelector('[data-test="job-description-text"], [data-test="UpCLineClamp"], .up-line-clamp-v2, .job-description-text');
      if (descEl)
      {
        description = descEl.innerText.trim();
      } else
      {
        // Fallback: finding the longest paragraph or span text within the card
        let longestText = '';
        const allTextContainers = el.querySelectorAll('div, span, p');
        for (const container of allTextContainers)
        {
          // Avoid the root node itself and nodes with too much child depth
          if (container.children.length === 0 || container.tagName === 'P')
          {
            const text = container.innerText.trim();
            if (text.length > longestText.length && text.length < 1500)
            {
              longestText = text;
            }
          }
        }
        description = longestText || 'No description extracted.';
      }

      // Truncate description if it's too long
      if (description.length > 300)
      {
        description = description.substring(0, 300) + '...';
      }

      results.push({ jobId, title, url, type, budget, proposals, location, paymentVerified, rating, description });
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
async function scrapeDeepJobDetails(page)
{
  try
  {
    await page.waitForSelector('[data-qa="client-location"], .client-about-box, [data-qa="client-info"]', { timeout: 8000 });
  } catch (err)
  {
    console.log('[Scraper] Deep Location timeout. Relying on generic extraction.');
  }

  const deepData = await page.evaluate(() =>
  {
    let location = 'Unknown';
    let proposals = 'Unknown';
    let hireRate = 'Unknown';
    let joinedDate = 'Unknown';
    let businessType = 'Unknown';
    let avgHourlyRate = 'Unknown';
    let jobsPosted = 'Unknown';
    let activeJobs = 'Unknown';
    let totalHires = 'Unknown';

    // New Attributes
    let lastViewed = 'Unknown';
    let interviewing = 'Unknown';
    let invitesSent = 'Unknown';
    let unansweredInvites = 'Unknown';
    let currentTime = 'Unknown';
    let paymentVerified = '❌';
    let phoneVerified = '❌';
    let isPrivate = window.location.href.includes('/freelance-jobs/apply/') || window.location.href.includes('/apply/');

    // 1. Location
    const locEl = document.querySelector('[data-qa="client-location"], [data-test="client-country"], [data-ui-cmp="client-location"]');
    if (locEl)
    {
      location = locEl.innerText.replace(/[\n\r]+/g, ' ').trim();
    } else
    {
      const clientBox = document.querySelector('[data-qa="client-info"], [data-test="client-info"]');
      if (clientBox)
      {
        const lis = clientBox.querySelectorAll('ul li');
        for (const li of lis)
        {
          if (li.innerText && li.innerText.length < 50 && !li.textContent.toLowerCase().includes('member since'))
          {
            const s = li.querySelector('strong');
            if (s) location = s.innerText.trim();
          }
        }
      }
    }

    // 2. Compact text retrieval for resilient regex (preserves spaces, kills newlines)
    const rawText = document.body ? document.body.textContent : '';
    const compactText = rawText.replace(/[\n\r]+/g, ' ').replace(/\s{2,}/g, ' ');

    if (!isPrivate && (compactText.toLowerCase().includes('private listing') || compactText.toLowerCase().includes('job is private')))
    {
      isPrivate = true;
    }

    // Proposals
    const pMatch = compactText.match(/Proposals:?\s*(Less than \d+|\d+ to \d+|\d+\+|\d+)/i);
    if (pMatch) proposals = pMatch[1].trim();

    // Client Info Heuristics
    const memberMatch = compactText.match(/Member since ([A-Za-z]+\s\d{1,2},\s\d{4})/i) || compactText.match(/Member since ([\w\s,]+?(?:\d{4}))/i) || compactText.match(/Member since (.+?)(?=\s|$)/i);
    if (memberMatch) joinedDate = memberMatch[1].trim();

    const hireRateMatch = compactText.match(/(\d+%)\s*hire rate/i);
    if (hireRateMatch) hireRate = hireRateMatch[1];

    const bizMatch = compactText.match(/(Small business|Large company|Mid-sized company)/i);
    if (bizMatch) businessType = bizMatch[0].trim();

    // Better business/industry extraction via explicit selectors
    const companyLi = document.querySelector('[data-qa="client-company-profile"]');
    if (companyLi)
    {
      const indEl = companyLi.querySelector('[data-qa="client-company-profile-industry"]') || companyLi.querySelector('strong');
      if (indEl) businessType = indEl.innerText.trim();
    }

    const avgMatch = compactText.match(/(\$[0-9,.]+(?:\s*\/\s*hr)?)\s*avg hourly rate/i);
    if (avgMatch) avgHourlyRate = avgMatch[1];

    const postedMatch = compactText.match(/(\d+)\s*job[s]? posted/i);
    if (postedMatch) jobsPosted = postedMatch[1];

    const openMatch = compactText.match(/(\d+)\s*(open|active)\s*job/i);
    if (openMatch) activeJobs = openMatch[1];

    const hiresMatch = compactText.match(/(?:Total hires\s*)?(\d+)\s*hire/i);
    if (hiresMatch) totalHires = hiresMatch[1];

    // Activity
    const caItems = document.querySelectorAll('.ca-item');
    for (const item of caItems)
    {
      if (item.innerText.toLowerCase().includes('last viewed'))
      {
        const val = item.querySelector('.value');
        if (val) lastViewed = val.innerText.trim();
        else
        {
          const parts = item.innerText.split(':');
          if (parts.length > 1) lastViewed = parts.slice(1).join(':').trim();
        }
      }
    }
    if (lastViewed === 'Unknown' || !lastViewed)
    {
      const viewMatch = compactText.match(/Last viewed by client:?\s*([\w\s]+ago|yesterday|recently|today)/i);
      if (viewMatch) lastViewed = viewMatch[1].trim();
    }

    const ivMatch = compactText.match(/Interviewing:?\s*(\d+)/i);
    if (ivMatch) interviewing = ivMatch[1];

    const isMatch = compactText.match(/Invites sent:?\s*(\d+)/i);
    if (isMatch) invitesSent = isMatch[1];

    const uiMatch = compactText.match(/Unanswered invites:?\s*(\d+)/i);
    if (uiMatch) unansweredInvites = uiMatch[1];

    // Verification
    if (/payment(?: method)? verified/i.test(compactText)) paymentVerified = '✅';
    if (/phone(?: number)? verified/i.test(compactText)) phoneVerified = '✅';

    // Current Time
    // Tries to look for common 12-hour AM/PM formats in the client info section
    const timeMatch = compactText.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
    if (timeMatch) currentTime = timeMatch[1];

    // Fix Troy 8:43 PM logic by extracting a few words before the AM/PM
    const fullTimeMatch = compactText.match(/([a-zA-Z]+\s+\d{1,2}:\d{2}\s*(?:AM|PM))/i);
    if (fullTimeMatch)
    {
      // if it caught "Troy 8:43 PM" instead of just "8:43 PM", let's use it
      currentTime = fullTimeMatch[1].trim();
    }

    let requiredConnects = 'Unknown';
    // Use querySelectorAll on common text wrappers since Upwork sometimes drops the <strong> tag
    const textWrappers = document.querySelectorAll('div, span, p');
    for (const el of textWrappers) {
      if (!el.innerText || el.children.length > 3) continue; // Skip huge containers
      
      const txt = el.innerText.replace(/\s+/g, ' ').trim(); // Normalize visual spaces safely
      
      const match = txt.match(/Send a proposal for:\s*(\d+)/i) ||
                    txt.match(/Cost to apply:\s*(\d+)/i) ||
                    txt.match(/(\d+)\s*required\s*Connects/i);
                    
      if (match) {
        requiredConnects = match[1];
        break;
      }
    }

    // Fallback regex approach on the entire flat body
    if (requiredConnects === 'Unknown') {
      const safeText = document.body.innerText || '';
      const propMatch = safeText.match(/(?:proposal|apply).*?(\d+)\s*Connects?/i) ||
                        compactText.match(/(?:proposal|apply).*?(\d+)\s*Connects?/i) ||
                        safeText.match(/(\d+)\s*required\s*Connects?/i) ||
                        safeText.match(/Send a proposal for:\s*(\d+)/i);
      if (propMatch) requiredConnects = propMatch[1];
    }

    let preferredQualifications = [];
    const qualListItems = document.querySelectorAll('.qualification-items li');
    for (const li of qualListItems)
    {
      const nameEl = li.querySelector('strong');
      const valEl = li.querySelector('span:not(.icons)');
      const danger = li.querySelector('.text-danger');
      if (nameEl && valEl)
      {
        preferredQualifications.push({
          name: nameEl.innerText.trim().replace(/:$/, ''),
          value: valEl.innerText.trim(),
          hasDanger: !!danger
        });
      }
    }

    return {
      location,
      proposals,
      hireRate,
      joinedDate,
      businessType,
      avgHourlyRate,
      jobsPosted,
      activeJobs,
      totalHires,
      lastViewed,
      interviewing,
      invitesSent,
      unansweredInvites,
      currentTime,
      paymentVerified,
      phoneVerified,
      isPrivate,
      requiredConnects,
      preferredQualifications
    };
  });

  return deepData;
}

module.exports = {
  scrapeJobsOnPage,
  scrapeDeepJobDetails
};
