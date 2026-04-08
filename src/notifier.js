const axios = require('axios');
require('dotenv').config();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

/**
 * Sends a job notification to the configured Telegram chat.
 * @param {Object} job - The job object containing details.
 */
async function sendJobNotification(job) {
  if (!TOKEN || !CHAT_ID) {
    console.warn('[Notifier] Telegram skip: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured.');
    return;
  }

  const escapeHtml = (text) => {
    if (!text) return 'N/A';
    return text.toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  };

  const title = escapeHtml(job.title);
  const type = escapeHtml(job.type || 'Unknown');
  const budget = escapeHtml(job.budget || 'Hourly / Not Specified');
  const proposals = escapeHtml(job.proposals || 'N/A');
  const location = job.location === 'Unknown' || !job.location ? 'Unknown | Private Listing' : escapeHtml(job.location);
  
  const hireRate = escapeHtml(job.hireRate || 'Unknown');
  const joinedDate = escapeHtml(job.joinedDate || 'Unknown');
  const businessType = escapeHtml(job.businessType || 'Unknown');
  const avgHourlyRate = escapeHtml(job.avgHourlyRate || 'Unknown');
  const jobsPosted = escapeHtml(job.jobsPosted || 'Unknown');
  const activeJobs = escapeHtml(job.activeJobs || 'Unknown');
  const totalHires = escapeHtml(job.totalHires || 'Unknown');
  
  const url = job.url;

  const message = `📌 <b>${title}</b>\n\n💼 <b>Type:</b> ${type}\n💰 <b>Budget:</b> ${budget}\n👥 <b>Proposals:</b> ${proposals}\n\n📊 <b>Client Info</b>\n📍 <b>Location:</b> ${location}\n📅 <b>Joined:</b> ${joinedDate}\n🏢 <b>Business:</b> ${businessType}\n📈 <b>Hire Rate:</b> ${hireRate}\n💸 <b>Avg Hourly Rate:</b> ${avgHourlyRate}\n📝 <b>Jobs Posted:</b> ${jobsPosted}\n🔥 <b>Active Jobs:</b> ${activeJobs}\n🤝 <b>Total Hires:</b> ${totalHires}\n\n🔗 <a href="${url}">View Job</a>`;

  try {
    const apiUrl = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
    await axios.post(apiUrl, {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });
    console.log(`[Notifier] Successfully sent Telegram alert for job: ${job.jobId}`);
  } catch (err) {
    console.error(`[Notifier] Error sending Telegram message:`, err.response?.data || err.message);
  }
}

/**
 * Sends an error or generic status message to Telegram.
 */
async function sendSystemMessage(text) {
  if (!TOKEN || !CHAT_ID) return;

  try {
    const apiUrl = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
    await axios.post(apiUrl, {
      chat_id: CHAT_ID,
      text: text
    });
  } catch (err) {
    console.error(`[Notifier] Error sending system message:`, err.message);
  }
}

module.exports = {
  sendJobNotification,
  sendSystemMessage
};
