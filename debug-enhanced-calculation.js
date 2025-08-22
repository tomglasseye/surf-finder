#!/usr/bin/env node

// Direct test of the enhanced calculation to see why it's wrong

function getEnhancedTideCalculation(latitude, longitude) {
	const currentTime = new Date();
	
	console.log(`🧮 Enhanced Calculation Test`);
	console.log(`📍 Location: ${latitude}, ${longitude}`);
	console.log(`🕐 Current time: ${currentTime.toLocaleString('en-GB', { timeZone: 'Europe/London' })} BST`);
	
	// Enhanced tidal calculation with multiple harmonic components
	const M2_PERIOD = 12.420601 * 3600000; // Main lunar semi-diurnal
	const S2_PERIOD = 12.0 * 3600000; // Solar semi-diurnal
	const O1_PERIOD = 25.819342 * 3600000; // Lunar diurnal

	// UK location-specific corrections
	let locationOffset = 0;
	let amplitudeCorrection = 1.0;
	let phaseCorrection = 0;

	// Regional adjustments for UK coast
	if (latitude >= 50 && latitude <= 51 && longitude >= -6 && longitude <= -4) {
		// Cornwall - Atlantic influence
		locationOffset = -1.5 * 3600000;
		amplitudeCorrection = 0.8;
		phaseCorrection = Math.PI * 0.2;
		console.log(`🏖️ Cornwall region detected`);
	} else if (latitude >= 50 && latitude <= 51 && longitude >= -4 && longitude <= -2) {
		// Devon/Dorset coast
		locationOffset = -1 * 3600000;
		amplitudeCorrection = 0.9;
		phaseCorrection = Math.PI * 0.1;
		console.log(`🏖️ Devon/Dorset region detected`);
	}

	const adjustedTime = currentTime.getTime() + locationOffset;
	console.log(`⏰ Location offset: ${locationOffset / 3600000} hours`);

	// Calculate tidal components
	const M2_component = Math.cos((adjustedTime / M2_PERIOD) * 2 * Math.PI + phaseCorrection);
	const S2_component = Math.cos((adjustedTime / S2_PERIOD) * 2 * Math.PI + phaseCorrection * 0.5);
	const O1_component = Math.cos((adjustedTime / O1_PERIOD) * 2 * Math.PI + phaseCorrection * 0.3);

	console.log(`🌊 M2 component: ${M2_component.toFixed(3)}`);
	console.log(`☀️ S2 component: ${S2_component.toFixed(3)}`);
	console.log(`🌙 O1 component: ${O1_component.toFixed(3)}`);

	const tideLevel = 0.5 + amplitudeCorrection * (
		0.4 * M2_component +
		0.15 * S2_component +
		0.1 * O1_component
	);

	const normalizedLevel = Math.max(0.05, Math.min(0.95, tideLevel));

	// Calculate next extremes
	const M2_cycle_position = (adjustedTime % M2_PERIOD) / M2_PERIOD;
	let timeToNextHigh, timeToNextLow;

	console.log(`🔄 M2 cycle position: ${(M2_cycle_position * 100).toFixed(1)}%`);

	if (M2_cycle_position < 0.25) {
		timeToNextHigh = (0.25 - M2_cycle_position) * M2_PERIOD;
		timeToNextLow = (0.75 - M2_cycle_position) * M2_PERIOD;
		console.log(`📈 Period: Rising towards high tide`);
	} else if (M2_cycle_position < 0.75) {
		timeToNextHigh = (1.25 - M2_cycle_position) * M2_PERIOD;
		timeToNextLow = (0.75 - M2_cycle_position) * M2_PERIOD;
		console.log(`📉 Period: Falling towards low tide`);
	} else {
		timeToNextHigh = (1.25 - M2_cycle_position) * M2_PERIOD;
		timeToNextLow = (1.75 - M2_cycle_position) * M2_PERIOD;
		console.log(`📈 Period: Rising towards next high tide`);
	}

	// Rising/falling determination
	const M2_derivative = -Math.sin((adjustedTime / M2_PERIOD) * 2 * Math.PI + phaseCorrection);
	const isRising = M2_derivative > 0;

	console.log(`🔀 M2 derivative: ${M2_derivative.toFixed(3)}`);
	console.log(`📊 Direction: ${isRising ? 'RISING' : 'FALLING'}`);

	return {
		currentLevel: normalizedLevel,
		nextHigh: new Date(currentTime.getTime() + timeToNextHigh),
		nextLow: new Date(currentTime.getTime() + timeToNextLow),
		isRising: isRising,
		source: "enhanced_calculation",
	};
}

// Test Cornwall locations
console.log("🧪 TESTING ENHANCED CALCULATION");
console.log("================================");
console.log("Expected: FALLING (per BBC data)");
console.log("Test: Mathematical calculation");

const locations = [
	{ name: "Fistral Beach, Newquay", lat: 50.4119, lng: -5.0757 },
	{ name: "Perranporth", lat: 50.3465, lng: -5.157 },
	{ name: "Constantine Bay", lat: 50.5167, lng: -4.9667 }
];

locations.forEach(location => {
	console.log(`\n${'='.repeat(50)}`);
	console.log(`📍 ${location.name}`);
	
	const result = getEnhancedTideCalculation(location.lat, location.lng);
	
	console.log(`\n🎯 RESULT:`);
	console.log(`🌊 Tide Level: ${(result.currentLevel * 100).toFixed(1)}%`);
	console.log(`📈 Direction: ${result.isRising ? '🔼 RISING ❌' : '🔽 FALLING ✅'}`);
	console.log(`⏰ Next High: ${result.nextHigh.toLocaleString('en-GB', { timeZone: 'Europe/London' })} BST`);
	console.log(`⏰ Next Low:  ${result.nextLow.toLocaleString('en-GB', { timeZone: 'Europe/London' })} BST`);
});

console.log(`\n🔍 ANALYSIS:`);
console.log(`If these show RISING, the mathematical model is wrong.`);
console.log(`The M2 lunar cycle doesn't align with real UK tides today.`);
console.log(`This is why we need the StormGlass API for accuracy.`);
