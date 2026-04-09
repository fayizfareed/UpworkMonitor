const { connect } = require('puppeteer-real-browser');

async function test() {
  const { browser, page } = await connect({
    headless: false,
    turnstile: true
  });

  await page.goto("https://www.upwork.com/nx/search/jobs/details/~022041540746499992740?sort=recency&subcategory2_uid=531770282593251331,531770282593251329,531770282589057033,531770282589057034,531770282589057036,531770282589057037,1737190722360750082,531770282589057025,531770282589057026,531770282589057024,531770282589057032,531770282589057030,531770282589057028,531770282589057029,531770282584862733&page=1&per_page=50&pageTitle=Job%20Details", { waitUntil: 'domcontentloaded', timeout: 60000 });
  
  await new Promise(r => setTimeout(r, 6000));

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
    let lastViewed = 'Unknown';
    let interviewing = 'Unknown';
    let invitesSent = 'Unknown';
    let unansweredInvites = 'Unknown';
    let currentTime = 'Unknown';
    let paymentVerified = '❌';
    let phoneVerified = '❌';

    // Compactor: flatten DOM to one giant clean string
    const bodyText = document.body && document.body.innerText ? document.body.innerText : '';
    const compactText = bodyText.replace(/[\n\r]+/g, ' ').replace(/\s{2,}/g, ' ');

    // 1. Proposals
    const pMatch = compactText.match(/Proposals:?\s*(Less than \d+|\d+ to \d+|\d+\+|\d+)/i);
    if (pMatch) proposals = pMatch[1].trim();

    // 2. Client Info Heuristics
    const memberMatch = compactText.match(/Member since (.+?)(?=\s|$)/i);
    if (memberMatch) joinedDate = memberMatch[1].trim();

    const hireRateMatch = compactText.match(/(\d+%)\s*hire rate/i);
    if (hireRateMatch) hireRate = hireRateMatch[1];

    const bizMatch = compactText.match(/(Small business|Large company|Mid-sized company)/i);
    if (bizMatch) businessType = bizMatch[0].trim();

    const avgMatch = compactText.match(/(\$[0-9,.]+(?:\/hr)?)\s*avg hourly rate/i);
    if (avgMatch) avgHourlyRate = avgMatch[1];

    const postedMatch = compactText.match(/(\d+)\s*jobs posted/i);
    if (postedMatch) jobsPosted = postedMatch[1];

    const openMatch = compactText.match(/(\d+)\s*(open|active)\s*job/i);
    if (openMatch) activeJobs = openMatch[1];

    const hiresMatch = compactText.match(/(?:Total hires\s*)?(\d+)\s*hire/i);
    if (hiresMatch) totalHires = hiresMatch[1];

    // Client Activity
    const viewMatch = compactText.match(/Last viewed by client:\s*([^Proposals|Interviewing|Invites]+?)(?=Interviewing|Invites|Proposals|$)/i);
    if (viewMatch) lastViewed = viewMatch[1].trim();

    const ivMatch = compactText.match(/Interviewing:\s*(\d+)/i);
    if (ivMatch) interviewing = ivMatch[1];

    const isMatch = compactText.match(/Invites sent:\s*(\d+)/i);
    if (isMatch) invitesSent = isMatch[1];

    const uiMatch = compactText.match(/Unanswered invites:\s*(\d+)/i);
    if (uiMatch) unansweredInvites = uiMatch[1];

    // Verifications
    if (/payment method verified/i.test(compactText) || /payment verified/i.test(compactText)) {
      paymentVerified = '✅';
    }
    if (/phone number verified/i.test(compactText) || /phone verified/i.test(compactText)) {
      phoneVerified = '✅';
    }

    // Attempt explicit DOM targeting for location and time since it's tricky in regex
    const locBox = document.querySelector('[data-qa="client-location"], [data-test="client-country"]');
    if (locBox) {
       location = locBox.innerText.replace(/[\n\r]+/g, ' ').trim();
    }
    
    const timeBoxes = Array.from(document.querySelectorAll('li')).filter(li => /AM|PM/i.test(li.innerText) && li.innerText.length < 30);
    if (timeBoxes.length > 0) currentTime = timeBoxes[0].innerText.replace(/[\n\r]+/g, ' ').trim();

    return {
      location, proposals, hireRate, joinedDate, businessType, avgHourlyRate,
      jobsPosted, activeJobs, totalHires, lastViewed, interviewing, invitesSent,
      unansweredInvites, currentTime, paymentVerified, phoneVerified, compactText
    };
  });

  console.log(JSON.stringify(deepData, null, 2));
  await browser.close();
  process.exit();
}

test();
