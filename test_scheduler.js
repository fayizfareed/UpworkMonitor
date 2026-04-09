const { calculateNextInterval } = require('./src/utils');

const mockSchedules = [
  { from: "00:00", to: "23:59", intervalMinutes: 10 }
];

console.log("--- Testing Scheduler Logic ---");

// Test 1: Match found (using mockSchedules which covers the whole day)
const intervalWithSchedule = calculateNextInterval(120, 0, mockSchedules);
console.log(`Test 1 (Match): Expected ~600s, Got ${intervalWithSchedule.toFixed(1)}s`);

// Test 2: No match (empty schedules)
const intervalNoSchedule = calculateNextInterval(120, 0, []);
console.log(`Test 2 (No Match): Expected ~120s, Got ${intervalNoSchedule.toFixed(1)}s`);

// Test 3: Randomness Check (Max variance)
const factor = 0.5;
const base = 120;
const results = [];
for (let i = 0; i < 100; i++) {
    results.push(calculateNextInterval(base, factor, []));
}
const min = Math.min(...results);
const max = Math.max(...results);
console.log(`Test 3 (Randomness): Base 120, Factor 0.5 -> Range [60, 180]. Actual Range: [${min.toFixed(1)}, ${max.toFixed(1)}]`);

console.log("--- End of Test ---");
