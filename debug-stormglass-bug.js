#!/usr/bin/env node

// Test to demonstrate the StormGlass tide direction bug

console.log("🐛 STORMGLASS TIDE DIRECTION BUG ANALYSIS");
console.log("==========================================");

// Simulate the current scenario from the live data
const mockTideData = {
	data: [
		{ time: "2025-08-22T23:25:00.000Z", type: "low" }, // Next low (37 mins from now)
		{ time: "2025-08-23T05:21:00.000Z", type: "high" }, // Next high (6h from now)
	],
};

const now = new Date("2025-08-22T22:07:00.000Z"); // Current time (23:07 BST)
console.log(`🕐 Current time: ${now.toISOString()}`);
console.log(`🔽 Next low: ${mockTideData.data[0].time}`);
console.log(`🔼 Next high: ${mockTideData.data[1].time}`);

// Current algorithm logic
function processStormGlassTideDataBuggy(tidesData, now) {
	let currentLevel = 0.5;
	let isRising = true;

	const currentTime = now.getTime();

	// Calculate current tide level based on position between extremes
	const allExtremes = tidesData.data.sort(
		(a, b) => new Date(a.time) - new Date(b.time)
	);

	console.log("\n🔍 ANALYZING EXTREMES:");
	allExtremes.forEach((extreme, i) => {
		const time = new Date(extreme.time);
		const isCurrent = time.getTime() > currentTime;
		console.log(
			`${i}: ${extreme.type} at ${time.toISOString()} ${isCurrent ? "(future)" : "(past)"}`
		);
	});

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
			console.log(`✅ FOUND INTERVAL!`);
			const timeDiff = nextExtremeTime - currentExtremeTime;
			const currentProgress =
				(currentTime - currentExtremeTime) / timeDiff;

			console.log(`  Progress: ${(currentProgress * 100).toFixed(1)}%`);

			if (currentExtreme.type === "high" && nextExtreme.type === "low") {
				console.log(`  📉 High → Low: FALLING`);
				currentLevel = 0.85 - currentProgress * 0.65;
				isRising = false;
			} else if (
				currentExtreme.type === "low" &&
				nextExtreme.type === "high"
			) {
				console.log(`  📈 Low → High: RISING`);
				currentLevel = 0.2 + currentProgress * 0.65;
				isRising = true;
			} else {
				console.log(`  🔄 Same types - using buggy logic`);
				const midLevel = currentExtreme.type === "high" ? 0.85 : 0.2;
				const amplitude = currentExtreme.type === "high" ? -0.32 : 0.32;
				currentLevel =
					midLevel + amplitude * Math.cos(currentProgress * Math.PI);
				isRising = currentExtreme.type === "low"; // 🐛 BUG HERE!
				console.log(
					`  🐛 BUGGY LINE: isRising = currentExtreme.type === "low" = ${isRising}`
				);
			}
			break;
		}
	}

	console.log(`\n🎯 RESULT:`);
	console.log(`🌊 Level: ${(currentLevel * 100).toFixed(1)}%`);
	console.log(`📈 Direction: ${isRising ? "🔼 RISING ❌" : "🔽 FALLING ✅"}`);

	return {
		currentLevel: Math.max(0.05, Math.min(0.95, currentLevel)),
		isRising: isRising,
		source: "stormglass",
	};
}

// Test the buggy version
console.log("\n" + "=".repeat(50));
console.log("🐛 TESTING BUGGY VERSION");
const buggyResult = processStormGlassTideDataBuggy(mockTideData, now);

console.log(`\n💡 THE BUG:`);
console.log(`We're currently approaching a LOW tide (37 mins away)`);
console.log(`This means tide should be FALLING`);
console.log(
	`But the algorithm shows: ${buggyResult.isRising ? "RISING ❌" : "FALLING ✅"}`
);
console.log(`The bug is in the "same types" logic on line 274`);
