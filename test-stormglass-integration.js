#!/usr/bin/env node

// Test the complete StormGlass tide integration with caching

// Mock Map for caching (in production this would be persistent storage)
const tideCache = new Map();

// Cache helper functions (same as in get-forecast.js)
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

// Process StormGlass tide extremes data
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

// Recalculate current tide level from cached extremes data
function recalculateCurrentTideLevel(cachedTideData) {
	const now = new Date();
	return processStormGlassTideData(cachedTideData, now);
}

// Simplified getTideData function for testing
async function getTideData(latitude, longitude) {
	try {
		// Check cache first
		const cacheKey = getTideCacheKey(latitude, longitude);
		const cachedData = tideCache.get(cacheKey);

		if (cachedData && isTideCacheValid(cachedData)) {
			console.log("✅ Using cached tide data for", latitude, longitude);

			// Recalculate current level based on current time and cached extremes
			return recalculateCurrentTideLevel(cachedData.data);
		}

		// StormGlass.io API
		const stormGlassApiKey = process.env.ADMIRALTY_API_KEY;

		if (stormGlassApiKey) {
			try {
				// Get 48 hours of tide extremes for better coverage
				const now = new Date();
				const twoDaysLater = new Date(now.getTime() + 48 * 3600000);

				const startTime = now.toISOString();
				const endTime = twoDaysLater.toISOString();

				// StormGlass API endpoint for tide extremes
				const stormGlassUrl = `https://api.stormglass.io/v2/tide/extremes/point?lat=${latitude}&lng=${longitude}&start=${startTime}&end=${endTime}`;

				console.log(
					"🌊 Fetching fresh tide data from StormGlass for:",
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

					// Cache the raw tide extremes data for the day
					const cacheEntry = {
						data: tidesData,
						timestamp: now.toISOString(),
						location: { latitude, longitude },
					};

					tideCache.set(cacheKey, cacheEntry);
					console.log("💾 Cached tide data for location:", cacheKey);

					return processStormGlassTideData(tidesData, now);
				} else {
					const errorText = await response.text();
					console.log(
						"❌ StormGlass API error:",
						response.status,
						errorText
					);

					if (response.status === 401) {
						console.log(
							"🔑 Invalid StormGlass API key - check your ADMIRALTY_API_KEY environment variable"
						);
					} else if (response.status === 429) {
						console.log(
							"⏰ StormGlass rate limit exceeded (50 requests/day) - falling back to calculation"
						);
					}
				}
			} catch (stormGlassError) {
				console.log("StormGlass API error:", stormGlassError.message);
			}
		} else {
			console.log("No StormGlass API key found - using mock data");
		}

		// Fallback: Return mock data for testing
		console.log("🧮 Using mock tide data for testing");
		return {
			currentLevel: 0.6,
			isRising: true,
			nextHigh: new Date(Date.now() + 3 * 3600000),
			nextLow: new Date(Date.now() + 9 * 3600000),
			source: "mock_calculation",
		};
	} catch (error) {
		console.error("Error in getTideData:", error);
		return null;
	}
}

// Test the complete system
async function testStormGlassIntegration() {
	console.log("🧪 Testing StormGlass Integration with Caching");
	console.log("==============================================");

	// Test locations
	const locations = [
		{ name: "Newquay, Cornwall", lat: 50.4119, lng: -5.0757 },
		{ name: "Brighton", lat: 50.8214, lng: -0.1393 },
		{ name: "St Ives, Cornwall", lat: 50.2161, lng: -5.4776 },
	];

	// Test each location twice to test caching
	for (const location of locations) {
		console.log(
			`\n📍 Testing ${location.name} (${location.lat}, ${location.lng})`
		);

		// First call - should fetch fresh data
		console.log("\n🔄 First call (should fetch fresh data):");
		const firstResult = await getTideData(location.lat, location.lng);
		if (firstResult) {
			console.log(
				`   Tide Level: ${(firstResult.currentLevel * 100).toFixed(1)}%`
			);
			console.log(`   Rising: ${firstResult.isRising ? "Yes" : "No"}`);
			console.log(`   Source: ${firstResult.source}`);
			console.log(
				`   Next High: ${firstResult.nextHigh.toLocaleTimeString()}`
			);
			console.log(
				`   Next Low: ${firstResult.nextLow.toLocaleTimeString()}`
			);
		}

		// Small delay
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Second call - should use cache
		console.log("\n🔄 Second call (should use cache):");
		const secondResult = await getTideData(location.lat, location.lng);
		if (secondResult) {
			console.log(
				`   Tide Level: ${(secondResult.currentLevel * 100).toFixed(1)}%`
			);
			console.log(`   Rising: ${secondResult.isRising ? "Yes" : "No"}`);
			console.log(`   Source: ${secondResult.source}`);
		}
	}

	console.log("\n🎯 Cache System Status");
	console.log("======================");
	console.log(`Cache size: ${tideCache.size} entries`);
	console.log(`Cache keys: ${Array.from(tideCache.keys()).join(", ")}`);

	console.log("\n✅ Integration test completed!");
}

// Run the test
testStormGlassIntegration().catch(console.error);
