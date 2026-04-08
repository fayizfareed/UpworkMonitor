/**
 * Detects newly posted jobs by comparing scraped jobs with the stored last Job ID.
 * @param {string} searchUrl - The URL currently being processed
 * @param {Array} scrapedJobs - The array of jobs scraped from the page
 * @param {Object} storageData - The current key-value storage object
 * @returns {Object} { newJobs: Array, updatedStorageData: Object }
 */
function detectNewJobs(searchUrl, scrapedJobs, storageData)
{
  if (!scrapedJobs || scrapedJobs.length === 0)
  {
    return { newJobs: [], updatedStorageData: storageData };
  }

  const lastProcessedJobId = storageData[searchUrl];
  const newJobs = [];

  // Scraped jobs are naturally ordered newest to oldest from the page top down.
  for (const job of scrapedJobs)
  {
    // If we hit the last processed job, we stop considering older jobs as new
    if (job.jobId === lastProcessedJobId)
    {
      break;
    }
    newJobs.push(job);
  }

  // Important: Reverse the list so we send the oldest newly undetected job first,
  // making the final messages match chronological order.
  const chronologicalNewJobs = newJobs.reverse();

  const newStorageData = { ...storageData };

  // Always update the stored ID to the top-most job scraped (the newest one), 
  // so long as we managed to scrape something.
  if (scrapedJobs.length > 0)
  {
    newStorageData[searchUrl] = scrapedJobs[0].jobId;
  }

  // If there was no stored last URL (first time running), 
  // we do NOT treat the items as "new" for notifications, we just save the ID
  // to avoid spamming the user on start.
  // if (!lastProcessedJobId) {
  //   console.log(`[Detector] First run for URL context. Stored top Job ID: ${newStorageData[searchUrl]}`);
  //   return { newJobs: [], updatedStorageData: newStorageData };
  // }

  return { newJobs: chronologicalNewJobs, updatedStorageData: newStorageData };
}

module.exports = {
  detectNewJobs
};
