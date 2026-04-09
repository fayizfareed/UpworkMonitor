const config = require('../config.json');

/**
 * Applies custom configured filters to an array of jobs.
 * @param {Array} jobs - Array of newly detected jobs.
 * @returns {Array} Array of jobs that pass the filter criteria.
 */
function applyCustomFilters(jobs)
{
  if (!config.filters) return jobs;

  const { minFixedPrice, minHourlyRate, excludeKeywords, requirePaymentVerified, maxProposals } = config.filters;

  return jobs.filter(job =>
  {
    // 1. Keyword Filter (Case-insensitive, whole word only)
    if (excludeKeywords && Array.isArray(excludeKeywords) && excludeKeywords.length > 0)
    {
      const title = job.title || '';
      const hasExcludedKeyword = excludeKeywords.some(keyword =>
      {
        // Escape any regex special characters in the user's keyword
        const escapedKeyword = keyword.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
        // \b matches a word boundary (but fails on symbols like C++), so we use a robust boundary
        // (\b or non-word char)
        const regex = new RegExp(`(^|\\W|_)${escapedKeyword}($|\\W|_)`, 'i');
        return regex.test(title);
      });
      
      if (hasExcludedKeyword)
      {
        console.log(`[Filter] Ignored job ${job.jobId} -> Title contains an excluded keyword.`);
        return false;
      }
    }

    // 2. Country Filter
    if (job.location && job.location !== 'Unknown' && isCountryExcluded(job.location))
    {
      console.log(`[Filter] Ignored job ${job.jobId} -> Excluded country on first page: ${job.location}`);
      return false;
    }

    // 3. Payment Verified Filter
    if (requirePaymentVerified && job.paymentVerified !== '✅')
    {
      console.log(`[Filter] Ignored job ${job.jobId} -> Payment method not verified.`);
      return false;
    }

    // 4. Proposals Filter
    if (typeof maxProposals === 'number' && maxProposals > 0 && job.proposals && job.proposals !== 'Unknown')
    {
      let lowerBound = 0;
      if (job.proposals.toLowerCase().includes('less than'))
      {
        lowerBound = 0;
      } else
      {
        const pMatch = job.proposals.match(/\d+/);
        if (pMatch) lowerBound = parseInt(pMatch[0], 10);
      }

      if (lowerBound >= maxProposals)
      {
        console.log(`[Filter] Ignored job ${job.jobId} -> Proposals (${job.proposals}) exceed configured limit of ${maxProposals}.`);
        return false;
      }
    }

    // If budget isn't distinctly specified, we should not ignore it based on instructions
    if (!job.budget || job.budget === 'Not Specified' || job.budget.toLowerCase() === 'hourly')
    {
      return true;
    }

    const isHourly = job.type === 'Hourly' || job.budget.toLowerCase().includes('/ hr');
    const isFixed = job.type === 'Fixed-price' || (!isHourly && job.budget.includes('$'));

    // Extract all numbers from the budget string (e.g. "$20.00 - $50.00" -> [20, 50])
    const matches = job.budget.match(/[\d,.]+[kKmM]?/g);
    if (!matches)
    {
      return true; // Unparseable budget string, play it safe
    }

    // Convert string numbers to float, ignoring commas, and handling 'k' or 'm'
    const numbers = matches.map(str =>
    {
      const lower = str.toLowerCase();
      let val = parseFloat(lower.replace(/,/g, '').replace(/[km]/g, ''));
      if (isNaN(val)) return 0;
      if (lower.includes('k')) val *= 1000;
      if (lower.includes('m')) val *= 1000000;
      return val;
    });

    // Using the MAXIMUM value in the range to determine if the client is willing to meet the minimum limit
    const offerToCheck = Math.max(...numbers);

    if (isHourly && minHourlyRate)
    {
      if (offerToCheck < minHourlyRate)
      {
        console.log(`[Filter] Ignored job ${job.jobId} -> Hourly rate max offer ($${offerToCheck}) is under your limit ($${minHourlyRate})`);
        return false;
      }
    }

    if (isFixed && minFixedPrice)
    {
      if (offerToCheck < minFixedPrice)
      {
        console.log(`[Filter] Ignored job ${job.jobId} -> Fixed price budget ($${offerToCheck}) is under your limit ($${minFixedPrice})`);
        return false;
      }
    }

    return true;
  });
}

/**
 * Checks if a country string exists in the excluded list configuration.
 * @param {string} country 
 * @returns {boolean}
 */
function isCountryExcluded(country)
{
  if (!config.filters || !config.filters.excludeCountries || !country) return false;
  if (!Array.isArray(config.filters.excludeCountries)) return false;

  const arrLower = config.filters.excludeCountries.map(c => c.toLowerCase().trim());
  return arrLower.includes(country.toLowerCase().trim());
}

module.exports = {
  applyCustomFilters,
  isCountryExcluded
};
