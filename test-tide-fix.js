#!/usr/bin/env node

// Test the fixed StormGlass tide direction calculation

console.log("🔧 TESTING FIXED STORMGLASS CALCULATION");
console.log("======================================");

// Simulate the current scenario with the fix
const mockTideDataWithFix = {
	data: [
		{ time: "2025-08-22T23:25:00.000Z", type: "low" }, // Next low (37 mins from now)
		{ time: "2025-08-23T05:21:00.000Z", type: "high" }, // Next high (6h from now)
	],
};

const now = new Date("2025-08-22T22:07:00.000Z"); // Current time (23:07 BST)

// Fixed algorithm logic
function processStormGlassTideDataFixed(tidesData, now) {
	let currentLevel = 0.5;
	let isRising = true;
	let nextHigh = null;
	let nextLow = null;

	if (tidesData.data && tidesData.data.length > 0) {
		const currentTime = now.getTime();

		// Find next high and low tide times
		const futureExtremes = tidesData.data
			.filter((extreme) => new Date(extreme.time).getTime() > currentTime)
			.sort((a, b) => new Date(a.time) - new Date(b.time));

		for (const extreme of futureExtremes) {
			if (extreme.type === "high" && !nextHigh) {
				nextHigh = new Date(extreme.time);
			} else if (extreme.type === "low" && !nextLow) {
				nextLow = new Date(extreme.time);
			}
		}

		// Calculate current tide level and direction based on position between extremes
		const allExtremes = tidesData.data.sort(
			(a, b) => new Date(a.time) - new Date(b.time)
		);

		console.log("\n🔍 ANALYZING EXTREMES:");
		allExtremes.forEach((extreme, i) => {
			const time = new Date(extreme.time);
			const isFuture = time.getTime() > currentTime;
			console.log(
				`${i}: ${extreme.type} at ${time.toISOString()} ${isFuture ? "(future)" : "(past)"}`
			);
		});

		// Find the interval containing current time
		let intervalFound = false;
		for (let i = 0; i < allExtremes.length - 1; i++) {
			const currentExtreme = allExtremes[i];
			const nextExtreme = allExtremes[i + 1];
			const currentExtremeTime = new Date(currentExtreme.time).getTime();
			const nextExtremeTime = new Date(nextExtreme.time).getTime();

			console.log(`\n📊 Checking interval ${i}:`);
			console.log(
				`  Current extreme: ${currentExtreme.type} at ${new Date(currentExtremeTime).toISOString()}`
			);
			console.log(
				`  Next extreme: ${nextExtreme.type} at ${new Date(nextExtremeTime).toISOString()}`
			);
			console.log(
				`  Current time in interval: ${currentExtremeTime <= currentTime && currentTime <= nextExtremeTime}`
			);

			if (
				currentExtremeTime <= currentTime &&
				currentTime <= nextExtremeTime
			) {
				intervalFound = true;
				console.log(`✅ FOUND INTERVAL!`);

				const timeDiff = nextExtremeTime - currentExtremeTime;
				const currentProgress =
					(currentTime - currentExtremeTime) / timeDiff;

				console.log(
					`  Progress: ${(currentProgress * 100).toFixed(1)}%`
				);

				if (
					currentExtreme.type === "high" &&
					nextExtreme.type === "low"
				) {
					console.log(`  📉 High → Low: FALLING`);
					currentLevel = 0.85 - currentProgress * 0.65; // 85% to 20%
					isRising = false;
				} else if (
					currentExtreme.type === "low" &&
					nextExtreme.type === "high"
				) {
					console.log(`  📈 Low → High: RISING`);
					currentLevel = 0.2 + currentProgress * 0.65; // 20% to 85%
					isRising = true;
				}
				break;
			}
		}

		// If no interval found, determine direction based on next extreme
		if (!intervalFound) {
			console.log(`\n🎯 NO INTERVAL FOUND - using next extreme logic`);
			const nextExtreme = futureExtremes[0];
			if (nextExtreme) {
				console.log(
					`  Next extreme: ${nextExtreme.type} at ${nextExtreme.time}`
				);
				// If next extreme is low, we're falling towards it
				// If next extreme is high, we're rising towards it
				isRising = nextExtreme.type === "high";
				console.log(
					`  🔧 FIXED LOGIC: isRising = nextExtreme.type === "high" = ${isRising}`
				);

				// Estimate current level based on time to next extreme
				const timeToNext =
					new Date(nextExtreme.time).getTime() - currentTime;
				const typicalTideInterval = 6.2 * 60 * 60 * 1000; // ~6.2 hours
				const progressToNext = Math.min(
					timeToNext / typicalTideInterval,
					1
				);

				console.log(
					`  Time to next: ${(timeToNext / (60 * 1000)).toFixed(0)} minutes`
				);
				console.log(
					`  Progress to next: ${(progressToNext * 100).toFixed(1)}%`
				);

				if (nextExtreme.type === "high") {
					// Rising towards high tide
					currentLevel = 0.2 + (1 - progressToNext) * 0.65;
					console.log(
						`  📈 Rising towards high: level = ${(currentLevel * 100).toFixed(1)}%`
					);
				} else {
					// Falling towards low tide
					currentLevel = 0.85 - (1 - progressToNext) * 0.65;
					console.log(
						`  📉 Falling towards low: level = ${(currentLevel * 100).toFixed(1)}%`
					);
				}
			}
		}
	}

	console.log(`\n🎯 FINAL RESULT:`);
	console.log(`🌊 Level: ${(currentLevel * 100).toFixed(1)}%`);
	console.log(`📈 Direction: ${isRising ? "🔼 RISING ❌" : "🔽 FALLING ✅"}`);

	return {
		currentLevel: Math.max(0.05, Math.min(0.95, currentLevel)),
		isRising: isRising,
		nextHigh: nextHigh || new Date(now.getTime() + 6 * 3600000),
		nextLow: nextLow || new Date(now.getTime() + 3 * 3600000),
		source: "stormglass",
	};
}

// Test the fixed version
console.log(`🕐 Current time: ${now.toISOString()}`);
console.log(`🔽 Next low: ${mockTideDataWithFix.data[0].time} (37 mins away)`);
console.log(`🔼 Next high: ${mockTideDataWithFix.data[1].time} (6h away)`);
console.log(`📋 Expected: FALLING (towards the low tide)`);

const fixedResult = processStormGlassTideDataFixed(mockTideDataWithFix, now);

console.log(`\n💡 THE FIX:`);
console.log(`✅ Now using next extreme to determine direction`);
console.log(`✅ If next extreme is LOW → we're FALLING towards it`);
console.log(`✅ If next extreme is HIGH → we're RISING towards it`);
console.log(`✅ Result: ${fixedResult.isRising ? "RISING ❌" : "FALLING ✅"}`);
