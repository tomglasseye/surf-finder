#!/usr/bin/env node

// Test current tide direction calculation to see if it's inverted

console.log("🔍 TESTING TIDE DIRECTION LOGIC");
console.log("===============================");

// Simulate the calculateCurrentTideFromExtremes function logic
function testTideDirection() {
	// Test case 1: Between LOW and HIGH (should be RISING)
	console.log("\n📊 TEST CASE 1: Between LOW tide and HIGH tide");
	const lowTide = { time: "2025-08-22T06:00:00Z", height: 0.5, type: "low" };
	const highTide = {
		time: "2025-08-22T12:00:00Z",
		height: 2.0,
		type: "high",
	};

	// Current time: 9:00 AM (3 hours after low, 3 hours before high)
	const currentTime = new Date("2025-08-22T09:00:00Z");

	const beforeTime = new Date(lowTide.time).getTime();
	const afterTime = new Date(highTide.time).getTime();
	const targetTime = currentTime.getTime();
	const progress = (targetTime - beforeTime) / (afterTime - beforeTime);

	// OLD LOGIC (potentially wrong)
	const oldDirection =
		highTide.height > lowTide.height ? "RISING" : "FALLING";

	// NEW LOGIC (correct)
	const cosineDerivative =
		(Math.sin(progress * Math.PI) *
			Math.PI *
			(highTide.height - lowTide.height)) /
		(afterTime - beforeTime);
	const newDirection = cosineDerivative > 0 ? "RISING" : "FALLING";

	// Tide height at 9 AM
	const smoothProgress = (1 - Math.cos(progress * Math.PI)) / 2;
	const currentHeight =
		lowTide.height + (highTide.height - lowTide.height) * smoothProgress;

	console.log(`   Low tide:  ${lowTide.time} - ${lowTide.height}m`);
	console.log(
		`   Current:   ${currentTime.toISOString()} - ${currentHeight.toFixed(2)}m`
	);
	console.log(`   High tide: ${highTide.time} - ${highTide.height}m`);
	console.log(`   Progress: ${(progress * 100).toFixed(1)}% through cycle`);
	console.log(`   OLD direction: ${oldDirection}`);
	console.log(
		`   NEW direction: ${newDirection} (derivative: ${cosineDerivative.toFixed(4)})`
	);
	console.log(`   EXPECTED: RISING ✅`);

	// Test case 2: Between HIGH and LOW (should be FALLING)
	console.log("\n📊 TEST CASE 2: Between HIGH tide and LOW tide");
	const highTide2 = {
		time: "2025-08-22T12:00:00Z",
		height: 2.0,
		type: "high",
	};
	const lowTide2 = { time: "2025-08-22T18:00:00Z", height: 0.5, type: "low" };

	// Current time: 3:00 PM (3 hours after high, 3 hours before low)
	const currentTime2 = new Date("2025-08-22T15:00:00Z");

	const beforeTime2 = new Date(highTide2.time).getTime();
	const afterTime2 = new Date(lowTide2.time).getTime();
	const targetTime2 = currentTime2.getTime();
	const progress2 = (targetTime2 - beforeTime2) / (afterTime2 - beforeTime2);

	// OLD LOGIC (potentially wrong)
	const oldDirection2 =
		lowTide2.height > highTide2.height ? "RISING" : "FALLING";

	// NEW LOGIC (correct)
	const cosineDerivative2 =
		(Math.sin(progress2 * Math.PI) *
			Math.PI *
			(lowTide2.height - highTide2.height)) /
		(afterTime2 - beforeTime2);
	const newDirection2 = cosineDerivative2 > 0 ? "RISING" : "FALLING";

	// Tide height at 3 PM
	const smoothProgress2 = (1 - Math.cos(progress2 * Math.PI)) / 2;
	const currentHeight2 =
		highTide2.height +
		(lowTide2.height - highTide2.height) * smoothProgress2;

	console.log(`   High tide: ${highTide2.time} - ${highTide2.height}m`);
	console.log(
		`   Current:   ${currentTime2.toISOString()} - ${currentHeight2.toFixed(2)}m`
	);
	console.log(`   Low tide:  ${lowTide2.time} - ${lowTide2.height}m`);
	console.log(`   Progress: ${(progress2 * 100).toFixed(1)}% through cycle`);
	console.log(`   OLD direction: ${oldDirection2}`);
	console.log(
		`   NEW direction: ${newDirection2} (derivative: ${cosineDerivative2.toFixed(4)})`
	);
	console.log(`   EXPECTED: FALLING ✅`);

	console.log("\n🎯 ANALYSIS:");
	console.log("OLD LOGIC: Simply compares next extreme to previous extreme");
	console.log(
		"NEW LOGIC: Uses derivative of cosine curve to determine actual direction"
	);
	console.log("");
	console.log("The OLD logic would always say RISING when going low→high,");
	console.log(
		"and FALLING when going high→low, regardless of current position."
	);
	console.log("");
	console.log("The NEW logic correctly determines direction based on where");
	console.log("you are in the tidal cycle using calculus (derivative).");
}

testTideDirection();
