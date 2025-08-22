#!/usr/bin/env node

// Extract and analyze the tide data from the live function response

console.log("🔍 LIVE FUNCTION TIDE DATA ANALYSIS");
console.log("====================================");

// The response shows tide data for today (2025-08-23):
const todayTideData = {
  "currentLevel": 0.5,
  "isRising": true,      // ❌ This should be FALSE per BBC data
  "nextHigh": "2025-08-23T05:21:00.000Z",
  "nextLow": "2025-08-22T23:25:00.000Z",
  "source": "stormglass"  // ✅ Using StormGlass API correctly
};

console.log("📊 CURRENT TIDE DATA:");
console.log(`🌊 Level: ${(todayTideData.currentLevel * 100).toFixed(1)}%`);
console.log(`📈 Direction: ${todayTideData.isRising ? '🔼 RISING ❌' : '🔽 FALLING ✅'}`);
console.log(`📡 Source: ${todayTideData.source} ✅`);

const nextHigh = new Date(todayTideData.nextHigh);
const nextLow = new Date(todayTideData.nextLow);
const now = new Date();

console.log(`\n⏰ TIDE TIMES (BST):`);
console.log(`🔼 Next High: ${nextHigh.toLocaleString('en-GB', { timeZone: 'Europe/London' })} BST`);
console.log(`🔽 Next Low:  ${nextLow.toLocaleString('en-GB', { timeZone: 'Europe/London' })} BST`);
console.log(`🕐 Current:   ${now.toLocaleString('en-GB', { timeZone: 'Europe/London' })} BST`);

console.log(`\n🧮 LOGIC CHECK:`);
console.log(`If low tide was at 00:25 BST today (past)`);
console.log(`And next high is at 06:21 BST today (future)`);
console.log(`Then at ${now.toLocaleString('en-GB', { timeZone: 'Europe/London' })} BST, tide should be RISING`);

console.log(`\n❓ THE ISSUE:`);
console.log(`The StormGlass API is showing tide as RISING`);
console.log(`But BBC shows tide as FALLING`);
console.log(`This suggests either:`);
console.log(`1. StormGlass data is wrong`);
console.log(`2. BBC data is for a different location`);
console.log(`3. Time zone conversion issue`);

console.log(`\n🔬 DEBUGGING NEXT STEPS:`);
console.log(`1. Check what location StormGlass is using`);
console.log(`2. Compare exact times with BBC`);
console.log(`3. Verify time zone handling`);
console.log(`4. Check if we're getting cached old data`);
