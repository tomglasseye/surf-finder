// Enhanced UK Tide Data with StormGlass.io API
// This provides 1,500 requests/month vs WorldTides' 100

async function getTideDataStormGlass(latitude, longitude) {
	try {
		// StormGlass.io API - 50 requests/day (1,500/month)
		// Sign up at: https://stormglass.io/
		const stormGlassApiKey =
			process.env.STORMGLASS_API_KEY || process.env.ADMIRALTY_API_KEY;

		if (stormGlassApiKey) {
			try {
				const now = new Date();
				const tomorrow = new Date(now.getTime() + 48 * 3600000); // 48 hours for better coverage

				const startTime = now.toISOString();
				const endTime = tomorrow.toISOString();

				// StormGlass API for tide extremes (high/low tides)
				const stormGlassUrl = `https://api.stormglass.io/v2/tide/extremes/point?lat=${latitude}&lng=${longitude}&start=${startTime}&end=${endTime}`;

				console.log(
					"Fetching StormGlass tide data for:",
					latitude,
					longitude
				);

				const response = await fetch(stormGlassUrl, {
					headers: {
						Authorization: stormGlassApiKey,
					},
				});

				if (response.ok) {
					const tidesData = await response.json();
					console.log(
						"✅ StormGlass API success:",
						tidesData.data ? tidesData.data.length : 0,
						"tide extremes"
					);

					return processStormGlassTideData(tidesData, now);
				} else {
					const errorText = await response.text();
					console.log(
						"❌ StormGlass API error:",
						response.status,
						errorText
					);

					// Check if it's an authentication error
					if (response.status === 401) {
						console.log(
							"🔑 Invalid StormGlass API key - check your STORMGLASS_API_KEY environment variable"
						);
					} else if (response.status === 429) {
						console.log(
							"⏰ StormGlass rate limit exceeded - falling back to calculation"
						);
					}
				}
			} catch (stormGlassError) {
				console.log("StormGlass API error:", stormGlassError.message);
			}
		} else {
			console.log(
				"No StormGlass API key found - using enhanced calculation"
			);
		}

		// Fallback to enhanced harmonic calculation
		return getEnhancedTideCalculation(latitude, longitude);
	} catch (error) {
		console.error("Error in getTideDataStormGlass:", error);
		return getEnhancedTideCalculation(latitude, longitude);
	}
}

function processStormGlassTideData(tidesData, now) {
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

		// Calculate current tide level based on position between extremes
		const allExtremes = tidesData.data.sort(
			(a, b) => new Date(a.time) - new Date(b.time)
		);

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

				if (
					currentExtreme.type === "high" &&
					nextExtreme.type === "low"
				) {
					// Falling tide: high to low
					currentLevel = 0.85 - currentProgress * 0.65; // 85% to 20%
					isRising = false;
				} else if (
					currentExtreme.type === "low" &&
					nextExtreme.type === "high"
				) {
					// Rising tide: low to high
					currentLevel = 0.2 + currentProgress * 0.65; // 20% to 85%
					isRising = true;
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
		source: "stormglass",
	};
}

function getEnhancedTideCalculation(latitude, longitude) {
	// This is your existing enhanced harmonic calculation
	// (Same as what's currently in the file)

	const currentTime = new Date();

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
		// Cornwall
		locationOffset = -1.5 * 3600000;
		amplitudeCorrection = 0.8;
		phaseCorrection = Math.PI * 0.2;
	} else if (
		latitude >= 51 &&
		latitude <= 52 &&
		longitude >= -3 &&
		longitude <= -1
	) {
		// Bristol Channel
		locationOffset = 0.5 * 3600000;
		amplitudeCorrection = 1.5;
		phaseCorrection = Math.PI * 0.3;
	}
	// ... (other regional corrections)

	const adjustedTime = currentTime.getTime() + locationOffset;

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

	return {
		currentLevel: normalizedLevel,
		nextHigh: new Date(currentTime.getTime() + timeToNextHigh),
		nextLow: new Date(currentTime.getTime() + timeToNextLow),
		isRising: isRising,
		source: "enhanced_calculation",
	};
}

module.exports = { getTideDataStormGlass };
