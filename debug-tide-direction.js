#!/usr/bin/env node

// Debug tide direction calculation vs BBC data for Wadebridge

// BBC tide data for Wadebridge today (22 August 2025)
const bbcTideData = {
	data: [
		{ time: "2025-08-22T02:10:00.000Z", type: "low", height: 0.2 }, // 03:10 BST
		{ time: "2025-08-22T04:40:00.000Z", type: "high", height: 2.5 }, // 05:40 BST
		{ time: "2025-08-22T14:23:00.000Z", type: "low", height: 0.2 }, // 15:23 BST
		{ time: "2025-08-22T16:58:00.000Z", type: "high", height: 3.0 }, // 17:58 BST

		// Tomorrow's data
		{ time: "2025-08-23T02:52:00.000Z", type: "low", height: 0.2 }, // 03:52 BST
		{ time: "2025-08-23T05:22:00.000Z", type: "high", height: 2.4 }, // 06:22 BST
	],
};

// Our current processing function (copied from get-forecast.js)
function processStormGlassTideData(tidesData, now) {
	let currentLevel = 0.5;
	let isRising = true;
	let nextHigh = null;
	let nextLow = null;

	console.log(
		`\n🕐 Current time: ${now.toLocaleString("en-GB", { timeZone: "Europe/London" })} BST`
	);
	console.log(`🕐 Current time UTC: ${now.toISOString()}`);

	if (tidesData.data && tidesData.data.length > 0) {
		const currentTime = now.getTime();

		// Find next high and low tide times
		const futureExtremes = tidesData.data
			.filter((extreme) => new Date(extreme.time).getTime() > currentTime)
			.sort((a, b) => new Date(a.time) - new Date(b.time));

		console.log(`\n🔮 Future extremes from current time:`);
		futureExtremes.forEach((extreme) => {
			const timeStr = new Date(extreme.time).toLocaleString("en-GB", {
				timeZone: "Europe/London",
			});
			console.log(
				`   ${extreme.type.toUpperCase()}: ${timeStr} BST (${extreme.height}m)`
			);
		});

		for (const extreme of futureExtremes) {
			if (extreme.type === "high" && !nextHigh) {
				nextHigh = new Date(extreme.time);
			} else if (extreme.type === "low" && !nextLow) {
				nextLow = new Date(extreme.time);
			}
		}

		// Calculate current tide level based on position between extremes
		const allExtremes = tidesData.data.sort(
			(a, b) => new Date(a.time) - new Date(b.time)
		);

		console.log(`\n📊 All extremes in chronological order:`);
		allExtremes.forEach((extreme) => {
			const timeStr = new Date(extreme.time).toLocaleString("en-GB", {
				timeZone: "Europe/London",
			});
			const isCurrent = new Date(extreme.time).getTime() <= currentTime;
			console.log(
				`   ${extreme.type.toUpperCase()}: ${timeStr} BST (${extreme.height}m) ${isCurrent ? "✅ PAST" : "⏳ FUTURE"}`
			);
		});

		// Find the relevant time period
		for (let i = 0; i < allExtremes.length - 1; i++) {
			const currentExtreme = allExtremes[i];
			const nextExtreme = allExtremes[i + 1];
			const currentExtremeTime = new Date(currentExtreme.time).getTime();
			const nextExtremeTime = new Date(nextExtreme.time).getTime();

			if (
				currentExtremeTime <= currentTime &&
				currentTime <= nextExtremeTime
			) {
				const timeDiff = nextExtremeTime - currentExtremeTime;
				const currentProgress =
					(currentTime - currentExtremeTime) / timeDiff;

				console.log(`\n⏰ FOUND CURRENT PERIOD:`);
				console.log(
					`   From: ${currentExtreme.type.toUpperCase()} at ${new Date(currentExtreme.time).toLocaleString("en-GB", { timeZone: "Europe/London" })} BST`
				);
				console.log(
					`   To:   ${nextExtreme.type.toUpperCase()} at ${new Date(nextExtreme.time).toLocaleString("en-GB", { timeZone: "Europe/London" })} BST`
				);
				console.log(
					`   Progress: ${(currentProgress * 100).toFixed(1)}% through this period`
				);

				if (
					currentExtreme.type === "high" &&
					nextExtreme.type === "low"
				) {
					// Falling tide: high to low
					currentLevel = 0.85 - currentProgress * 0.65; // 85% to 20%
					isRising = false;
					console.log(`   🔽 FALLING TIDE: High → Low`);
					console.log(
						`   📉 Calculated level: ${(currentLevel * 100).toFixed(1)}%`
					);
				} else if (
					currentExtreme.type === "low" &&
					nextExtreme.type === "high"
				) {
					// Rising tide: low to high
					currentLevel = 0.2 + currentProgress * 0.65; // 20% to 85%
					isRising = true;
					console.log(`   🔼 RISING TIDE: Low → High`);
					console.log(
						`   📈 Calculated level: ${(currentLevel * 100).toFixed(1)}%`
					);
				} else {
					// Between similar extremes - use sinusoidal approximation
					const midLevel =
						currentExtreme.type === "high" ? 0.85 : 0.2;
					const amplitude =
						currentExtreme.type === "high" ? -0.32 : 0.32;
					currentLevel =
						midLevel +
						amplitude * Math.cos(currentProgress * Math.PI);
					isRising = currentExtreme.type === "low";
					console.log(
						`   🌊 SIMILAR EXTREMES: ${currentExtreme.type} → ${nextExtreme.type}`
					);
					console.log(
						`   📊 Calculated level: ${(currentLevel * 100).toFixed(1)}%`
					);
				}
				break;
			}
		}
	}

	return {
		currentLevel: Math.max(0.05, Math.min(0.95, currentLevel)),
		isRising: isRising,
		nextHigh: nextHigh || new Date(now.getTime() + 6 * 3600000),
		nextLow: nextLow || new Date(now.getTime() + 3 * 3600000),
		source: "debug_test",
	};
}

async function debugTideDirection() {
	console.log("🐛 DEBUGGING TIDE DIRECTION CALCULATION");
	console.log("=======================================");
	console.log("📍 Location: Wadebridge, Cornwall");
	console.log("🌐 Source: BBC Weather tide data");
	console.log("✅ Expected: FALLING (according to BBC)");

	// Test at current time
	const now = new Date();
	const result = processStormGlassTideData(bbcTideData, now);

	console.log(`\n🎯 FINAL RESULT:`);
	console.log(`================`);
	console.log(`🌊 Tide Level: ${(result.currentLevel * 100).toFixed(1)}%`);
	console.log(
		`📈 Direction: ${result.isRising ? "🔼 RISING" : "🔽 FALLING"}`
	);
	console.log(
		`⏰ Next High: ${result.nextHigh.toLocaleString("en-GB", { timeZone: "Europe/London" })} BST`
	);
	console.log(
		`⏰ Next Low:  ${result.nextLow.toLocaleString("en-GB", { timeZone: "Europe/London" })} BST`
	);

	console.log(`\n🎉 VERIFICATION:`);
	console.log(`================`);
	console.log(`BBC says: FALLING`);
	console.log(
		`Our calc: ${result.isRising ? "RISING ❌ WRONG" : "FALLING ✅ CORRECT"}`
	);

	if (result.isRising !== false) {
		console.log(`\n💥 ERROR DETECTED: Calculation is wrong!`);
		console.log(
			`📝 Need to debug the logic for determining tide direction`
		);
	} else {
		console.log(`\n✅ SUCCESS: Calculation matches BBC data!`);
	}
}

debugTideDirection().catch(console.error);
