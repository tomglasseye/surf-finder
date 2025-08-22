#!/usr/bin/env node

// Test the actual get-forecast function with a specific location

// Import the actual function - for testing let's copy the relevant parts
const tideCache = new Map();

function getTideCacheKey(latitude, longitude) {
	return `tide_${latitude.toFixed(3)}_${longitude.toFixed(3)}`;
}

function isTideCacheValid(cacheEntry) {
	if (!cacheEntry || !cacheEntry.timestamp) return false;

	const cacheTime = new Date(cacheEntry.timestamp);
	const now = new Date();
	const hoursSinceCached =
		(now.getTime() - cacheTime.getTime()) / (1000 * 60 * 60);

	// Cache valid for 24 hours
	return hoursSinceCached < 24;
}

// Enhanced harmonic calculation (the fallback we might be using)
function getEnhancedTideCalculation(latitude, longitude) {
	const currentTime = new Date();

	console.log(`🕐 Enhanced calculation for: ${latitude}, ${longitude}`);
	console.log(
		`🕐 Current time: ${currentTime.toLocaleString("en-GB", { timeZone: "Europe/London" })} BST`
	);

	// Enhanced tidal calculation with multiple harmonic components
	const M2_PERIOD = 12.420601 * 3600000; // Main lunar semi-diurnal
	const S2_PERIOD = 12.0 * 3600000; // Solar semi-diurnal
	const O1_PERIOD = 25.819342 * 3600000; // Lunar diurnal

	// UK location-specific corrections
	let locationOffset = 0;
	let amplitudeCorrection = 1.0;
	let phaseCorrection = 0;

	// Regional adjustments for UK coast
	if (
		latitude >= 50 &&
		latitude <= 51 &&
		longitude >= -6 &&
		longitude <= -4
	) {
		// Cornwall - Atlantic influence
		locationOffset = -1.5 * 3600000;
		amplitudeCorrection = 0.8;
		phaseCorrection = Math.PI * 0.2;
		console.log(`🏖️ Cornwall region detected - applying corrections`);
	} else if (
		latitude >= 50 &&
		latitude <= 51 &&
		longitude >= -4 &&
		longitude <= -2
	) {
		// Devon/Dorset coast
		locationOffset = -1 * 3600000;
		amplitudeCorrection = 0.9;
		phaseCorrection = Math.PI * 0.1;
		console.log(`🏖️ Devon/Dorset region detected - applying corrections`);
	} else if (
		latitude >= 51 &&
		latitude <= 52 &&
		longitude >= -3 &&
		longitude <= -1
	) {
		// Bristol Channel - large tidal range
		locationOffset = 0.5 * 3600000;
		amplitudeCorrection = 1.5;
		phaseCorrection = Math.PI * 0.3;
		console.log(
			`🏖️ Bristol Channel region detected - applying corrections`
		);
	} else {
		console.log(`🏖️ Using default tidal parameters`);
	}

	const adjustedTime = currentTime.getTime() + locationOffset;
	console.log(`⏰ Adjusted time offset: ${locationOffset / 3600000} hours`);

	// Calculate tidal components
	const M2_component = Math.cos(
		(adjustedTime / M2_PERIOD) * 2 * Math.PI + phaseCorrection
	);
	const S2_component = Math.cos(
		(adjustedTime / S2_PERIOD) * 2 * Math.PI + phaseCorrection * 0.5
	);
	const O1_component = Math.cos(
		(adjustedTime / O1_PERIOD) * 2 * Math.PI + phaseCorrection * 0.3
	);

	const tideLevel =
		0.5 +
		amplitudeCorrection *
			(0.4 * M2_component + 0.15 * S2_component + 0.1 * O1_component);

	const normalizedLevel = Math.max(0.05, Math.min(0.95, tideLevel));

	// Calculate next extremes
	const M2_cycle_position = (adjustedTime % M2_PERIOD) / M2_PERIOD;
	let timeToNextHigh, timeToNextLow;

	if (M2_cycle_position < 0.25) {
		timeToNextHigh = (0.25 - M2_cycle_position) * M2_PERIOD;
		timeToNextLow = (0.75 - M2_cycle_position) * M2_PERIOD;
	} else if (M2_cycle_position < 0.75) {
		timeToNextHigh = (1.25 - M2_cycle_position) * M2_PERIOD;
		timeToNextLow = (0.75 - M2_cycle_position) * M2_PERIOD;
	} else {
		timeToNextHigh = (1.25 - M2_cycle_position) * M2_PERIOD;
		timeToNextLow = (1.75 - M2_cycle_position) * M2_PERIOD;
	}

	// Rising/falling determination
	const M2_derivative = -Math.sin(
		(adjustedTime / M2_PERIOD) * 2 * Math.PI + phaseCorrection
	);
	const isRising = M2_derivative > 0;

	console.log(
		`🧮 M2 cycle position: ${(M2_cycle_position * 100).toFixed(1)}%`
	);
	console.log(
		`🧮 M2 derivative: ${M2_derivative.toFixed(3)} (${isRising ? "RISING" : "FALLING"})`
	);
	console.log(`🌊 Calculated level: ${(normalizedLevel * 100).toFixed(1)}%`);

	return {
		currentLevel: normalizedLevel,
		nextHigh: new Date(currentTime.getTime() + timeToNextHigh),
		nextLow: new Date(currentTime.getTime() + timeToNextLow),
		isRising: isRising,
		source: "enhanced_calculation",
	};
}

async function testRealTideFunction() {
	console.log("🧪 TESTING REAL TIDE FUNCTION");
	console.log("==============================");

	// Test locations that might be showing wrong data
	const testLocations = [
		{ name: "Wadebridge, Cornwall", lat: 50.4161, lng: -5.0931 },
		{ name: "Fistral Beach, Newquay", lat: 50.4119, lng: -5.0757 },
		{ name: "St Ives, Cornwall", lat: 50.2161, lng: -5.4776 },
		{ name: "Brighton Beach", lat: 50.8214, lng: -0.1393 },
	];

	for (const location of testLocations) {
		console.log(`\n📍 ${location.name} (${location.lat}, ${location.lng})`);
		console.log("=".repeat(50));

		// Test enhanced calculation (this is likely what's being used since API might not be working)
		const result = getEnhancedTideCalculation(location.lat, location.lng);

		console.log(`\n🎯 RESULT:`);
		console.log(
			`🌊 Tide Level: ${(result.currentLevel * 100).toFixed(1)}%`
		);
		console.log(
			`📈 Direction: ${result.isRising ? "🔼 RISING" : "🔽 FALLING"}`
		);
		console.log(
			`⏰ Next High: ${result.nextHigh.toLocaleString("en-GB", { timeZone: "Europe/London" })} BST`
		);
		console.log(
			`⏰ Next Low:  ${result.nextLow.toLocaleString("en-GB", { timeZone: "Europe/London" })} BST`
		);
		console.log(`📊 Source: ${result.source}`);

		// Compare with BBC expectation for Wadebridge area
		if (
			location.name.includes("Cornwall") ||
			location.name.includes("Newquay") ||
			location.name.includes("St Ives")
		) {
			const expectedFalling = true; // BBC says falling
			const actualFalling = !result.isRising;
			console.log(
				`\n✅ Verification (Cornwall locations should be FALLING):`
			);
			console.log(
				`Expected: FALLING, Got: ${actualFalling ? "FALLING ✅" : "RISING ❌"}`
			);
		}
	}

	console.log(`\n🔍 ANALYSIS:`);
	console.log(`=============`);
	console.log(
		`If Cornwall locations show RISING instead of FALLING, the issue is in the enhanced calculation.`
	);
	console.log(
		`The enhanced calculation uses mathematical models, not real tide data.`
	);
	console.log(
		`This is likely why it disagrees with BBC (which uses real UK Hydrographic Office data).`
	);
}

testRealTideFunction().catch(console.error);
