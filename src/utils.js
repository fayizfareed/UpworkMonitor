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
 * Calculates the next interval based on base and random factor.
 * e.g., base=120, factor=0.5 -> range [60, 180]
 */
function calculateNextInterval(baseIntervalSeconds, randomFactor) {
  const minInterval = baseIntervalSeconds * (1 - randomFactor);
  const maxInterval = baseIntervalSeconds * (1 + randomFactor);
  
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
async function randomScroll(page, stepSize = 50, delayMs = 50) {
  try {
    const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
    let currentScroll = await page.evaluate(() => window.scrollY);
    const targetScroll = getRandomInt(0, scrollHeight);

    const direction = targetScroll > currentScroll ? 1 : -1;
    while (Math.abs(targetScroll - currentScroll) > stepSize) {
      currentScroll += direction * stepSize;
      await page.evaluate((y) => window.scrollTo(0, y), currentScroll);
      await delay(delayMs);
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
