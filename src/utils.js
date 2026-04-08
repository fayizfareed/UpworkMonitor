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
 * Generates human-like movements and scrolling on a Puppeteer page.
 * Avoids rigid, programmatic sequences.
 */
async function simulateHumanBehavior(page) {
  // 1. Random mouse movement
  try {
    const x = getRandomInt(100, 800);
    const y = getRandomInt(100, 600);
    const steps = getRandomInt(10, 30);
    await page.mouse.move(x, y, { steps });
    await randomDelay(0.5, 1.5);
  } catch (err) {
    // Ignore mouse errors, could occur if target is missing
  }

  // 2. Random scrolling (partial or full)
  try {
    const scrolls = getRandomInt(1, 3);
    for (let i = 0; i < scrolls; i++) {
      const scrollAmount = getRandomInt(200, 800);
      const direction = Math.random() > 0.3 ? 1 : -1; // 70% chance to scroll down
      await page.mouse.wheel({ deltaY: scrollAmount * direction });
      await randomDelay(1, 3);
    }
  } catch (err) {}

  // 3. Occasional idle pause mimicking reading or tab switching
  if (Math.random() < 0.2) {
    const pauseTime = getRandomInt(5, 15);
    console.log(`[Human Behavior] Idle pause for ${pauseTime}s on the page...`);
    await delay(pauseTime * 1000);
  }
}

module.exports = {
  getRandomInt,
  getRandomFloat,
  delay,
  randomDelay,
  calculateNextInterval,
  simulateHumanBehavior
};
