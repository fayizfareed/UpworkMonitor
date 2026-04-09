/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 */
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Returns a random float between min and max.
 */
function getRandomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Halts execution for a specified number of milliseconds.
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Random delay within a generic small range, usually 2 to 7 seconds.
 */
async function randomDelay(minSec = 2, maxSec = 7) {
  const ms = getRandomInt(minSec * 1000, maxSec * 1000);
  await delay(ms);
}

/**
 * Checks if the current time falls within any configured schedules.
 * @param {Array} schedules - Array of schedule objects { from, to, intervalMinutes }
 * @returns {number|null} Interval in seconds if match found, else null.
 */
function getCurrentScheduleInterval(schedules) {
  if (!schedules || !Array.isArray(schedules)) return null;

  const now = new Date();
  const currentHHmm = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  for (const schedule of schedules) {
    if (currentHHmm >= schedule.from && currentHHmm <= schedule.to) {
      return schedule.intervalMinutes * 60;
    }
  }

  return null;
}

/**
 * Calculates the next interval based on base and random factor.
 * If a schedule matches, it overrides the base interval.
 */
function calculateNextInterval(baseIntervalSeconds, randomFactor, schedules = []) {
  const scheduleInterval = getCurrentScheduleInterval(schedules);
  const effectiveBase = scheduleInterval !== null ? scheduleInterval : baseIntervalSeconds;

  if (scheduleInterval !== null) {
      console.log(`[Scheduler] Active schedule found. Using interval: ${scheduleInterval / 60} minutes.`);
  }

  const minInterval = effectiveBase * (1 - randomFactor);
  const maxInterval = effectiveBase * (1 + randomFactor);
  
  let actualInterval = getRandomFloat(minInterval, maxInterval);

  // 15% chance to do a long pause to act more like a human taking a break
  const extraPauseChance = Math.random();
  if (extraPauseChance < 0.15) {
    const multiplier = getRandomFloat(2.0, 3.0);
    console.log(`[Human Behavior] Taking a longer break... (x${multiplier.toFixed(2)})`);
    actualInterval *= multiplier;
  }

  return actualInterval;
}

/**
 * Smoothly scrolls to a random position on the page based on step limits.
 */
async function randomScroll(page, stepSize = 30, delayMs = 150) {
  try {
    const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
    let currentScroll = await page.evaluate(() => window.scrollY);
    
    // Don't always scroll to a completely random spot, often just a bit up/down
    const currentY = await page.evaluate(() => window.scrollY);
    const viewPortHeight = await page.evaluate(() => window.innerHeight);
    
    // 70% chance to just scroll a bit, 30% chance for a long jump
    let targetScroll;
    if (Math.random() > 0.3) {
        const offset = getRandomInt(100, viewPortHeight);
        targetScroll = Math.max(0, Math.min(scrollHeight, currentY + (Math.random() > 0.5 ? offset : -offset)));
    } else {
        targetScroll = getRandomInt(0, scrollHeight);
    }

    const direction = targetScroll > currentScroll ? 1 : -1;
    while (Math.abs(targetScroll - currentScroll) > stepSize) {
      // Add slight jitter to step size for human feel
      const jitterStep = stepSize + getRandomInt(-10, 10);
      currentScroll += direction * Math.max(5, jitterStep);
      
      await page.evaluate((y) => window.scrollTo(0, y), currentScroll);
      
      // Add slight variation to delay
      await delay(delayMs + getRandomInt(-50, 50));
    }
    
    await page.evaluate((y) => window.scrollTo(0, y), targetScroll);
  } catch (err) {
    // page target might be gone
  }
}

/**
 * Randomly moves the mouse cursor across the current viewport.
 */
async function randomMouseMovement(page) {
  try {
    const viewport = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight
    }));

    const x = getRandomInt(0, viewport.width);
    const y = getRandomInt(0, viewport.height);
    const steps = getRandomInt(5, 30);

    await page.mouse.move(x, y, { steps });
  } catch (err) {
    // ignore
  }
}

/**
 * Executes a sequence of human-like behavior (wait, scroll, move).
 */
async function simulateHumanBehavior(page, minSeconds = 2, maxSeconds = 10) {
  const delaySec = getRandomFloat(minSeconds, maxSeconds);
  await delay(delaySec * 1000);
  
  await randomScroll(page);
  await randomMouseMovement(page);
}

module.exports = {
  getRandomInt,
  getRandomFloat,
  delay,
  randomDelay,
  calculateNextInterval,
  simulateHumanBehavior
};
