const config = require('../config.json');

/**
 * Applies custom configured filters to an array of jobs.
 * @param {Array} jobs - Array of newly detected jobs.
 * @returns {Array} Array of jobs that pass the filter criteria.
 */
function applyCustomFilters(jobs) {
  if (!config.filters) return jobs;

  const { minFixedPrice, minHourlyRate, excludeKeywords } = config.filters;

  return jobs.filter(job => {
    // 1. Keyword Filter (Case-insensitive)
    if (excludeKeywords && Array.isArray(excludeKeywords) && excludeKeywords.length > 0) {
      const titleLower = (job.title || '').toLowerCase();
      const hasExcludedKeyword = excludeKeywords.some(keyword => titleLower.includes(keyword.toLowerCase()));
      if (hasExcludedKeyword) {
        console.log(`[Filter] Ignored job ${job.jobId} -> Title contains an excluded keyword.`);
        return false;
      }
    }

    // If budget isn't distinctly specified, we should not ignore it based on instructions
    if (!job.budget || job.budget === 'Not Specified' || job.budget.toLowerCase() === 'hourly') {
      return true;
    }

    const isHourly = job.type === 'Hourly' || job.budget.toLowerCase().includes('/ hr');
    const isFixed = job.type === 'Fixed-price' || (!isHourly && job.budget.includes('$'));

    // Extract all numbers from the budget string (e.g. "$20.00 - $50.00" -> [20, 50])
    const matches = job.budget.match(/[\d,.]+/g);
    if (!matches) {
       return true; // Unparseable budget string, play it safe
    }

    // Convert string numbers to float, ignoring commas
    const numbers = matches.map(n => parseFloat(n.replace(/,/g, '')));
    
    // Using the maximum value in the range to determine if it meets our minimum limit
    const maxOffer = Math.max(...numbers);

    if (isHourly && minHourlyRate) {
      if (maxOffer < minHourlyRate) {
        console.log(`[Filter] Ignored job ${job.jobId} -> Hourly rate ($${maxOffer}) under limit ($${minHourlyRate})`);
        return false;
      }
    }

    if (isFixed && minFixedPrice) {
      if (maxOffer < minFixedPrice) {
        console.log(`[Filter] Ignored job ${job.jobId} -> Fixed price budget ($${maxOffer}) under limit ($${minFixedPrice})`);
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
function isCountryExcluded(country) {
  if (!config.filters || !config.filters.excludeCountries || !country) return false;
  if (!Array.isArray(config.filters.excludeCountries)) return false;

  const arrLower = config.filters.excludeCountries.map(c => c.toLowerCase().trim());
  return arrLower.includes(country.toLowerCase().trim());
}

module.exports = {
  applyCustomFilters,
  isCountryExcluded
};
