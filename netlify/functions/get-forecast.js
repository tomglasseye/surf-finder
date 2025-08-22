// Embed surf spots data directly to avoid file path issues in Netlify
const surfSpotsData = [
	{
		name: "Fistral Beach",
		latitude: 50.4161,
		longitude: -5.0931,
		skillLevel: "Intermediate",
		optimalSwellDir: [270, 315],
		optimalWindDir: [45, 135],
		bestTide: "mid",
		reliability: "Very Consistent",
	},
	{
		name: "Watergate Bay",
		latitude: 50.4425,
		longitude: -5.0394,
		skillLevel: "Beginner",
		optimalSwellDir: [270, 315],
		optimalWindDir: [90, 180],
		bestTide: "low_to_mid",
		reliability: "Consistent",
	},
	{
		name: "Polzeath",
		latitude: 50.5689,
		longitude: -4.9156,
		skillLevel: "Beginner",
		optimalSwellDir: [270, 330],
		optimalWindDir: [135, 225],
		bestTide: "mid_to_high",
		reliability: "Consistent",
	},
];

console.log("Netlify Function: get-forecast loaded");

function directionScore(actualDir, optimalRange) {
	if (!actualDir || !optimalRange) return 0.5;

	const [minOptimal, maxOptimal] = optimalRange;

	// Handle wraparound (e.g., 315-45 degrees)
	if (minOptimal > maxOptimal) {
		if (actualDir >= minOptimal || actualDir <= maxOptimal) {
			return 1.0;
		} else {
			const distToMin = Math.min(
				Math.abs(actualDir - minOptimal),
				360 - Math.abs(actualDir - minOptimal)
			);
			const distToMax = Math.min(
				Math.abs(actualDir - maxOptimal),
				360 - Math.abs(actualDir - maxOptimal)
			);
			const closestDist = Math.min(distToMin, distToMax);

			if (closestDist <= 15) return 0.9;
			if (closestDist <= 30) return 0.7;
			if (closestDist <= 45) return 0.5;
			if (closestDist <= 60) return 0.3;
			return 0.1;
		}
	} else {
		if (actualDir >= minOptimal && actualDir <= maxOptimal) {
			return 1.0;
		} else {
			const closestDist = Math.min(
				Math.abs(actualDir - minOptimal),
				Math.abs(actualDir - maxOptimal)
			);

			if (closestDist <= 15) return 0.9;
			if (closestDist <= 30) return 0.7;
			if (closestDist <= 45) return 0.5;
			if (closestDist <= 60) return 0.3;
			return 0.1;
		}
	}
}

// Enhanced multi-layer cache for tide data with smart expiration
const tideCache = new Map();
const apiUsageTracker = new Map(); // Track API calls per day

// Cache configuration optimized for tide extremes (can cache for days!)
const CACHE_CONFIG = {
	TIDE_EXTREMES_DAYS: 3, // Cache tide extremes for 3 days (good balance)
	MAX_CACHE_SIZE: 100, // More generous since we cache longer
	API_DAILY_LIMIT: 9, // Use 9 of your 10 daily calls (1 buffer for safety)
	CLEANUP_INTERVAL: 1000 * 60 * 60 * 12, // Clean cache every 12 hours
};

// Cache key generator - no date needed since extremes are valid for days
const getTideCacheKey = (latitude, longitude) => {
	const lat = Math.round(latitude * 1000) / 1000; // Round to 3 decimal places for precision
	const lng = Math.round(longitude * 1000) / 1000;
	return `tide_extremes_${lat}_${lng}`; // No date - extremes valid for days
};

// Enhanced cache validation with daily expiration (perfect for tides)
const isTideCacheValid = (cacheEntry) => {
	if (!cacheEntry || !cacheEntry.timestamp) return false;

	const now = new Date();
	const cacheDate = new Date(cacheEntry.timestamp);

	// Check if it's the same day (tides are valid for the entire day)
	const isSameDay = now.toDateString() === cacheDate.toDateString();

	if (!isSameDay) {
		console.log(
			`�️  Cache expired for ${cacheEntry.location?.latitude}, ${cacheEntry.location?.longitude} (new day)`
		);
	}

	return isSameDay;
};

// API usage tracking for quota management
const trackApiUsage = () => {
	const today = new Date().toISOString().split("T")[0];
	const current = apiUsageTracker.get(today) || 0;
	apiUsageTracker.set(today, current + 1);

	// Clean old entries
	const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
		.toISOString()
		.split("T")[0];
	apiUsageTracker.delete(yesterday);

	return current + 1;
};

// Check if we can make API calls today
const canMakeApiCall = () => {
	const today = new Date().toISOString().split("T")[0];
	const todayUsage = apiUsageTracker.get(today) || 0;
	return todayUsage < CACHE_CONFIG.API_DAILY_LIMIT;
};

// Cache cleanup to prevent memory leaks
const cleanupCache = () => {
	if (tideCache.size <= CACHE_CONFIG.MAX_CACHE_SIZE) return;

	console.log(`🧹 Cleaning cache (${tideCache.size} entries)`);

	// Convert to array and sort by timestamp (oldest first)
	const entries = Array.from(tideCache.entries())
		.map(([key, value]) => ({
			key,
			value,
			timestamp: new Date(value.timestamp),
		}))
		.sort((a, b) => a.timestamp - b.timestamp);

	// Remove oldest entries
	const toRemove = entries.slice(
		0,
		Math.floor(CACHE_CONFIG.MAX_CACHE_SIZE * 0.3)
	);
	toRemove.forEach((entry) => {
		tideCache.delete(entry.key);
		console.log(`🗑️  Removed cache entry: ${entry.key}`);
	});

	console.log(`✅ Cache cleaned: ${tideCache.size} entries remaining`);
};

// Auto-cleanup on interval (for long-running functions)
setInterval(cleanupCache, CACHE_CONFIG.CLEANUP_INTERVAL);

// Cache warming for popular locations to prevent cold starts
const POPULAR_LOCATIONS = [
	{ name: "Polzeath", lat: 50.579, lng: -4.9089 },
	{ name: "Fistral Beach", lat: 50.4161, lng: -5.0931 },
	{ name: "Watergate Bay", lat: 50.4425, lng: -5.0394 },
];

// Warm cache for popular locations (optional, runs after startup)
const warmPopularCaches = async () => {
	if (!canMakeApiCall()) return;

	console.log("🔥 Warming cache for popular locations...");

	for (const location of POPULAR_LOCATIONS) {
		const cacheKey = getTideCacheKey(location.lat, location.lng);
		const cached = tideCache.get(cacheKey);

		if (!cached || !isTideCacheValid(cached)) {
			try {
				await getTideData(location.lat, location.lng);
				console.log(`✅ Warmed cache for ${location.name}`);
				// Space out requests to avoid rate limiting
				await new Promise((resolve) => setTimeout(resolve, 1000));
			} catch (error) {
				console.log(
					`❌ Failed to warm cache for ${location.name}: ${error.message}`
				);
			}
		}
	}
};

// Optional: Warm cache on function startup (enabled since you have 10 API calls)
setTimeout(warmPopularCaches, 5000);

// Calculate current tide level from cached extremes data
const calculateCurrentTideFromExtremes = (
	extremesData,
	currentTime = new Date()
) => {
	if (!extremesData || !extremesData.data || extremesData.data.length < 2) {
		return null;
	}

	const extremes = extremesData.data;
	const targetTime = currentTime.getTime();

	// Find the surrounding extremes
	let before = null;
	let after = null;

	for (let i = 0; i < extremes.length - 1; i++) {
		const currentExtreme = new Date(extremes[i].time).getTime();
		const nextExtreme = new Date(extremes[i + 1].time).getTime();

		if (currentExtreme <= targetTime && targetTime <= nextExtreme) {
			before = extremes[i];
			after = extremes[i + 1];
			break;
		}
	}

	if (!before || !after) {
		// Use nearest extreme if outside range
		const nearest = extremes.reduce((prev, curr) => {
			const prevDiff = Math.abs(
				new Date(prev.time).getTime() - targetTime
			);
			const currDiff = Math.abs(
				new Date(curr.time).getTime() - targetTime
			);
			return currDiff < prevDiff ? curr : prev;
		});

		return {
			currentHeight: nearest.height,
			direction: "UNKNOWN",
			nextTide:
				extremes.find((e) => new Date(e.time).getTime() > targetTime) ||
				nearest,
			isInterpolated: false,
			confidence: "low",
			source: "cached_extremes",
		};
	}

	// Smooth cosine interpolation between extremes for realistic tidal curve
	const beforeTime = new Date(before.time).getTime();
	const afterTime = new Date(after.time).getTime();
	const progress = (targetTime - beforeTime) / (afterTime - beforeTime);

	// Cosine interpolation - but we need to account for direction!
	let smoothProgress;
	let cosineDerivative;
	
	if (after.height > before.height) {
		// RISING tide: LOW → HIGH, use standard cosine curve (0 to 1)
		smoothProgress = (1 - Math.cos(progress * Math.PI)) / 2;
		cosineDerivative = Math.sin(progress * Math.PI) * Math.PI * (after.height - before.height) / (afterTime - beforeTime);
	} else {
		// FALLING tide: HIGH → LOW, use inverted cosine curve (1 to 0)
		smoothProgress = (1 + Math.cos(progress * Math.PI)) / 2;
		cosineDerivative = -Math.sin(progress * Math.PI) * Math.PI * (before.height - after.height) / (afterTime - beforeTime);
	}
	
	const currentHeight = before.height + (after.height - before.height) * smoothProgress;

	// Calculate tide direction based on the derivative of the cosine curve
	const direction = cosineDerivative > 0 ? "RISING" : "FALLING";

	return {
		currentHeight: Math.round(currentHeight * 100) / 100,
		direction: direction,
		nextTide: after,
		timeToNextTide: afterTime - targetTime,
		isInterpolated: true,
		confidence: "high",
		extremesUsed: { before, after },
		source: "cached_extremes",
		derivative: cosineDerivative, // For debugging
	};
};

async function getTideData(latitude, longitude) {
	try {
		// Check cache first with enhanced validation
		const cacheKey = getTideCacheKey(latitude, longitude);
		const cachedData = tideCache.get(cacheKey);

		if (cachedData && isTideCacheValid(cachedData)) {
			const cacheAge =
				Math.round(
					(Date.now() - new Date(cachedData.timestamp)) /
						(1000 * 60 * 60 * 10)
				) / 100; // Hours with 2 decimal places
			console.log(
				`✅ Using cached tide extremes for ${latitude}, ${longitude} (${cacheAge}h old)`
			);

			// Calculate current tide level from cached extremes data
			const currentTide = calculateCurrentTideFromExtremes(
				cachedData.data
			);
			if (currentTide) {
				console.log(
					`🌊 Calculated tide: ${currentTide.currentHeight}m ${currentTide.direction} (${currentTide.confidence} confidence)`
				);
				return processStormGlassTideData(cachedData.data, new Date());
			}
		}

		// Check API quota before making request
		const apiUsage = trackApiUsage();
		console.log(
			`📊 API Usage: ${apiUsage}/${CACHE_CONFIG.API_DAILY_LIMIT} calls today`
		);

		if (!canMakeApiCall()) {
			console.log(
				`⚠️  API quota limit reached (${CACHE_CONFIG.API_DAILY_LIMIT} calls/day). Using fallback calculation.`
			);
			return getEnhancedTideCalculation(latitude, longitude);
		}

		// StormGlass.io API with enhanced caching strategy
		const stormGlassApiKey = process.env.STORMGLASS_API_KEY;

		if (stormGlassApiKey) {
			try {
				// Get extended time window for better coverage (72 hours)
				const now = new Date();
				const threeDaysLater = new Date(now.getTime() + 72 * 3600000);
				const oneDayBefore = new Date(
					now.getTime() - 24 * 60 * 60 * 1000
				);

				const startTime = oneDayBefore.toISOString();
				const endTime = threeDaysLater.toISOString();

				// StormGlass API endpoint for tide extremes
				const stormGlassUrl = `https://api.stormglass.io/v2/tide/extremes/point?lat=${latitude}&lng=${longitude}&start=${startTime}&end=${endTime}`;

				console.log(
					`🌊 Fetching fresh tide data from StormGlass for: ${latitude}, ${longitude}`
				);
				console.log(
					`⏰ Time window: ${startTime.split("T")[0]} to ${endTime.split("T")[0]}`
				);

				const response = await fetch(stormGlassUrl, {
					headers: {
						Authorization: stormGlassApiKey,
					},
					timeout: 10000, // 10 second timeout
				});

				if (response.ok) {
					const tidesData = await response.json();
					const extremeCount = tidesData.data
						? tidesData.data.length
						: 0;

					console.log(
						`✅ StormGlass API success: ${extremeCount} tide extremes fetched`
					);

					if (extremeCount === 0) {
						console.log(
							`⚠️  No tide data returned from API, using fallback calculation`
						);
						return getEnhancedTideCalculation(latitude, longitude);
					}

					// Enhanced cache entry with metadata
					const cacheEntry = {
						data: tidesData,
						timestamp: now.toISOString(),
						location: { latitude, longitude },
						extremeCount: extremeCount,
						apiUsage: apiUsage,
						timeWindow: { start: startTime, end: endTime },
					};

					// Store in cache and run cleanup if needed
					tideCache.set(cacheKey, cacheEntry);
					cleanupCache();

					console.log(
						`💾 Cached tide extremes for ${CACHE_CONFIG.TIDE_EXTREMES_DAYS} days: ${cacheKey}`
					);
					console.log(
						`📈 Cache stats: ${tideCache.size} locations, ${apiUsage}/${CACHE_CONFIG.API_DAILY_LIMIT} API calls today`
					);
					console.log(
						`🎯 Balanced caching: 3-day extremes + full API quota utilization`
					);

					return processStormGlassTideData(tidesData, now);
				} else {
					const errorText = await response.text();
					console.log(
						`❌ StormGlass API error: ${response.status} - ${errorText}`
					);

					if (response.status === 401) {
						console.log(
							`🔑 Invalid StormGlass API key - check your STORMGLASS_API_KEY environment variable`
						);
					} else if (response.status === 402) {
						console.log(
							`💰 StormGlass API quota exceeded - consider upgrading plan or reducing usage`
						);
					} else if (response.status === 429) {
						console.log(
							`⏰ StormGlass rate limit exceeded - falling back to calculation`
						);
					}

					// Don't count failed requests against quota
					const todayUsage =
						apiUsageTracker.get(
							new Date().toISOString().split("T")[0]
						) || 0;
					apiUsageTracker.set(
						new Date().toISOString().split("T")[0],
						Math.max(0, todayUsage - 1)
					);
				}
			} catch (stormGlassError) {
				console.log(
					`❌ StormGlass API error: ${stormGlassError.message}`
				);

				// Don't count network errors against quota
				const todayUsage =
					apiUsageTracker.get(
						new Date().toISOString().split("T")[0]
					) || 0;
				apiUsageTracker.set(
					new Date().toISOString().split("T")[0],
					Math.max(0, todayUsage - 1)
				);
			}
		} else {
			console.log(
				`🔑 No StormGlass API key found - using enhanced calculation`
			);
		}

		// Fallback to enhanced harmonic calculation if API fails
		console.log(
			`🧮 Using enhanced tidal calculation for ${latitude}, ${longitude}`
		);
		return getEnhancedTideCalculation(latitude, longitude);
	} catch (error) {
		console.error(`❌ Error in getTideData: ${error.message}`);
		return getEnhancedTideCalculation(latitude, longitude);
	}
}

// Recalculate current tide level from cached extremes data
function recalculateCurrentTideLevel(cachedTideData) {
	const now = new Date();
	return processStormGlassTideData(cachedTideData, now);
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

		// Calculate current tide level and direction based on position between extremes
		const allExtremes = tidesData.data.sort(
			(a, b) => new Date(a.time) - new Date(b.time)
		);

		// Find the interval containing current time
		let intervalFound = false;
		for (let i = 0; i < allExtremes.length - 1; i++) {
			const currentExtreme = allExtremes[i];
			const nextExtreme = allExtremes[i + 1];
			const currentExtremeTime = new Date(currentExtreme.time).getTime();
			const nextExtremeTime = new Date(nextExtreme.time).getTime();

			if (
				currentExtremeTime <= currentTime &&
				currentTime <= nextExtremeTime
			) {
				intervalFound = true;
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
				}
				break;
			}
		}

		// If no interval found, determine direction based on next extreme
		if (!intervalFound) {
			const nextExtreme = futureExtremes[0];
			if (nextExtreme) {
				// If next extreme is low, we're falling towards it
				// If next extreme is high, we're rising towards it
				isRising = nextExtreme.type === "high";

				// Estimate current level based on time to next extreme
				const timeToNext =
					new Date(nextExtreme.time).getTime() - currentTime;
				const typicalTideInterval = 6.2 * 60 * 60 * 1000; // ~6.2 hours
				const progressToNext = Math.min(
					timeToNext / typicalTideInterval,
					1
				);

				if (nextExtreme.type === "high") {
					// Rising towards high tide
					currentLevel = 0.2 + (1 - progressToNext) * 0.65;
				} else {
					// Falling towards low tide
					currentLevel = 0.85 - (1 - progressToNext) * 0.65;
				}
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

// Enhanced harmonic calculation fallback
function getEnhancedTideCalculation(latitude, longitude) {
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
		// Cornwall - Atlantic influence
		locationOffset = -1.5 * 3600000;
		amplitudeCorrection = 0.8;
		phaseCorrection = Math.PI * 0.2;
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
	} else if (
		latitude >= 52 &&
		latitude <= 53 &&
		longitude >= 0 &&
		longitude <= 2
	) {
		// East coast (Norfolk, Suffolk)
		locationOffset = 2 * 3600000;
		amplitudeCorrection = 0.7;
		phaseCorrection = Math.PI * 0.4;
	} else if (latitude >= 55 && longitude <= -4) {
		// Scotland west coast
		locationOffset = -2 * 3600000;
		amplitudeCorrection = 1.1;
		phaseCorrection = Math.PI * 0.15;
	}

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

async function get5DayForecast(latitude, longitude) {
	try {
		// Marine weather data - 5 days
		const marineUrl = new URL(
			"https://marine-api.open-meteo.com/v1/marine"
		);
		marineUrl.searchParams.set("latitude", latitude);
		marineUrl.searchParams.set("longitude", longitude);
		marineUrl.searchParams.set(
			"hourly",
			"wave_height,swell_wave_height,wind_wave_height,wave_direction,swell_wave_direction,wave_period,swell_wave_period"
		);
		marineUrl.searchParams.set("timezone", "Europe/London");
		marineUrl.searchParams.set("forecast_days", "5");

		// Wind data - 5 days
		const windUrl = new URL("https://api.open-meteo.com/v1/forecast");
		windUrl.searchParams.set("latitude", latitude);
		windUrl.searchParams.set("longitude", longitude);
		windUrl.searchParams.set("hourly", "wind_speed_10m,wind_direction_10m");
		windUrl.searchParams.set("timezone", "Europe/London");
		windUrl.searchParams.set("forecast_days", "5");

		const [marineResponse, windResponse] = await Promise.all([
			fetch(marineUrl),
			fetch(windUrl),
		]);

		const marineData = await marineResponse.json();
		const windData = await windResponse.json();

		return { marineData, windData };
	} catch (error) {
		console.error("Error fetching forecast:", error);
		return null;
	}
}

function calculateDaySurfScore(dayData, spot) {
	if (!dayData) return { score: 0, description: "No data available" };

	let score = 0;
	const factors = [];

	// Average the hourly data for the day
	const avgWaveHeight =
		dayData.waveHeight.reduce((a, b) => a + (b || 0), 0) /
		dayData.waveHeight.length;
	const avgSwellHeight =
		dayData.swellHeight.reduce((a, b) => a + (b || 0), 0) /
		dayData.swellHeight.length;
	const avgPeriod =
		dayData.period.reduce((a, b) => a + (b || 0), 0) /
		dayData.period.length;
	const avgWindSpeed =
		dayData.windSpeed.reduce((a, b) => a + (b || 0), 0) /
		dayData.windSpeed.length;

	const effectiveHeight = Math.max(avgWaveHeight, avgSwellHeight);

	// Wave height scoring (skill-level adjusted)
	const isBeginnerSpot = spot.skillLevel?.toLowerCase().includes("beginner");
	const isAdvancedSpot = spot.skillLevel?.toLowerCase().includes("advanced");

	let heightScore;
	if (isBeginnerSpot) {
		if (effectiveHeight >= 0.4 && effectiveHeight <= 1.5) {
			heightScore = 4;
			factors.push("Perfect beginner waves");
		} else if (effectiveHeight > 1.5 && effectiveHeight <= 2.0) {
			heightScore = 3;
			factors.push("Good size waves");
		} else if (effectiveHeight >= 0.2 && effectiveHeight < 0.4) {
			heightScore = 2;
			factors.push("Small but learnable");
		} else if (effectiveHeight > 2.0) {
			heightScore = 1;
			factors.push("Too big for beginners");
		} else {
			heightScore = 0;
			factors.push("Too small");
		}
	} else if (isAdvancedSpot) {
		if (effectiveHeight >= 1.5 && effectiveHeight <= 4.0) {
			heightScore = 4;
			factors.push("Excellent wave size");
		} else if (effectiveHeight > 4.0 && effectiveHeight <= 6.0) {
			heightScore = 3.5;
			factors.push("Big waves - advanced only");
		} else if (effectiveHeight >= 0.8 && effectiveHeight < 1.5) {
			heightScore = 3;
			factors.push("Decent size");
		} else if (effectiveHeight > 6.0) {
			heightScore = 2;
			factors.push("Very large - extreme conditions");
		} else {
			heightScore = 1;
			factors.push("Too small for this spot");
		}
	} else {
		if (effectiveHeight >= 0.6 && effectiveHeight <= 2.5) {
			heightScore = 4;
			factors.push("Great wave size");
		} else if (effectiveHeight > 2.5 && effectiveHeight <= 3.5) {
			heightScore = 3;
			factors.push("Good sized waves");
		} else if (effectiveHeight >= 0.3 && effectiveHeight < 0.6) {
			heightScore = 2;
			factors.push("Small but rideable");
		} else if (effectiveHeight > 3.5) {
			heightScore = 1.5;
			factors.push("Large waves");
		} else {
			heightScore = 0;
			factors.push("Too small");
		}
	}
	score += heightScore;

	// Period scoring
	let periodScore;
	if (avgPeriod >= 10 && avgPeriod <= 14) {
		periodScore = 2.5;
		factors.push("Premium groundswell");
	} else if (avgPeriod >= 8 && avgPeriod < 10) {
		periodScore = 2;
		factors.push("Good groundswell");
	} else if (
		(avgPeriod >= 6 && avgPeriod < 8) ||
		(avgPeriod > 14 && avgPeriod <= 18)
	) {
		periodScore = 1.5;
		factors.push("Decent swell period");
	} else if (avgPeriod >= 4 && avgPeriod < 6) {
		periodScore = 0.8;
		factors.push("Short period windswell");
	} else if (avgPeriod > 0) {
		periodScore = 0.3;
		factors.push("Very short period");
	} else {
		periodScore = 0;
	}
	score += periodScore;

	// Swell direction (use most common direction)
	const swellDirs = dayData.swellDirection.filter((d) => d !== null);
	if (swellDirs.length > 0 && spot.optimalSwellDir) {
		const avgSwellDir =
			swellDirs.reduce((a, b) => a + b, 0) / swellDirs.length;
		const swellScoreFactor = directionScore(
			avgSwellDir,
			spot.optimalSwellDir
		);
		score += 2.5 * swellScoreFactor;

		if (swellScoreFactor >= 0.9) {
			factors.push("Perfect swell angle!");
		} else if (swellScoreFactor >= 0.7) {
			factors.push("Good swell direction");
		} else if (swellScoreFactor >= 0.5) {
			factors.push("Acceptable swell angle");
		} else {
			factors.push("Poor swell direction");
		}
	} else {
		score += 1.2;
	}

	// Wind scoring
	if (avgWindSpeed <= 8) {
		score += 2;
		factors.push("Light winds");
	} else if (avgWindSpeed <= 15) {
		score += 1.5;
		factors.push("Moderate winds");
	} else if (avgWindSpeed <= 25) {
		score += 0.8;
		factors.push("Strong winds");
	} else {
		score += 0.2;
		factors.push("Very strong winds");
	}

	// Tide scoring (simplified for daily average) - 0-2 points
	let tideScore = 1.5; // Default neutral score
	if (dayData.tideData && spot.bestTide) {
		const bestTide = spot.bestTide.toLowerCase();
		if (bestTide === "all" || bestTide === "any") {
			tideScore = 2;
			factors.push("Works all tides");
		} else {
			// For daily forecast, give a general tide bonus
			tideScore = 1.7;
			factors.push("Tide favorable");
		}
	}
	score += tideScore;

	// Reliability bonus
	let reliabilityBonus = 0;
	if (spot.reliability) {
		const reliability = spot.reliability.toLowerCase();
		if (reliability.includes("very consistent")) {
			reliabilityBonus = 1;
		} else if (reliability.includes("consistent")) {
			reliabilityBonus = 0.7;
		} else if (reliability.includes("seasonal")) {
			reliabilityBonus = 0.3;
		}
	}
	score += reliabilityBonus;

	return {
		score: Math.min(Math.round(score * 10) / 10, 10.0),
		waveHeight: effectiveHeight,
		period: avgPeriod,
		windSpeed: avgWindSpeed,
		factors: factors.slice(0, 3), // Top 3 factors
		tideData: dayData.tideData,
	};
}

function calculateBestTimeOfDay(
	hourlyData,
	spot,
	tideData,
	latitude = 50.4,
	longitude = -5.0,
	targetDate = new Date()
) {
	const scores = [];

	// Calculate sunrise and sunset times
	const dayOfYear = Math.floor(
		(targetDate.getTime() -
			new Date(targetDate.getFullYear(), 0, 0).getTime()) /
			86400000
	);
	const p = Math.asin(
		0.39795 * Math.cos((0.98563 * (dayOfYear - 173) * Math.PI) / 180)
	);
	const a =
		(Math.sin((-0.83 * Math.PI) / 180) -
			Math.sin((latitude * Math.PI) / 180) * Math.sin(p)) /
		(Math.cos((latitude * Math.PI) / 180) * Math.cos(p));

	let sunriseHour, sunsetHour;

	if (Math.abs(a) > 1) {
		// Polar day/night scenario
		sunriseHour = Math.abs(a) > 1 && a > 0 ? null : 0;
		sunsetHour = Math.abs(a) > 1 && a > 0 ? null : 24;
	} else {
		const hourAngle = (Math.acos(a) * 180) / Math.PI / 15;
		const solarNoon = 12 - longitude / 15;
		sunriseHour = solarNoon - hourAngle;
		sunsetHour = solarNoon + hourAngle;
	}

	// Calculate score for each hour
	for (let hour = 0; hour < 24; hour++) {
		let hourScore = 0;
		const factors = [];

		// Wave height factor (0-3 points)
		const waveHeight = hourlyData.waveHeight[hour] || 0;
		const isBeginnerSpot = spot.skillLevel
			?.toLowerCase()
			.includes("beginner");
		const isAdvancedSpot = spot.skillLevel
			?.toLowerCase()
			.includes("advanced");

		if (isBeginnerSpot) {
			if (waveHeight >= 0.4 && waveHeight <= 1.5) {
				hourScore += 3;
				factors.push("Perfect beginner waves");
			} else if (waveHeight > 1.5 && waveHeight <= 2.0) {
				hourScore += 2;
				factors.push("Good size waves");
			} else if (waveHeight >= 0.2 && waveHeight < 0.4) {
				hourScore += 1;
				factors.push("Small but rideable");
			}
		} else if (isAdvancedSpot) {
			if (waveHeight >= 1.5 && waveHeight <= 4.0) {
				hourScore += 3;
				factors.push("Excellent wave size");
			} else if (waveHeight >= 0.8 && waveHeight < 1.5) {
				hourScore += 2;
				factors.push("Decent size");
			}
		} else {
			if (waveHeight >= 0.6 && waveHeight <= 2.5) {
				hourScore += 3;
				factors.push("Great wave size");
			} else if (waveHeight >= 0.3 && waveHeight < 0.6) {
				hourScore += 1;
				factors.push("Small but rideable");
			}
		}

		// Period factor (0-2 points)
		const period = hourlyData.period[hour] || 0;
		if (period >= 10) {
			hourScore += 2;
			factors.push("Premium groundswell");
		} else if (period >= 8) {
			hourScore += 1.5;
			factors.push("Good groundswell");
		} else if (period >= 6) {
			hourScore += 1;
			factors.push("Decent period");
		}

		// Wind factor (0-2 points)
		const windSpeed = hourlyData.windSpeed[hour] || 0;
		if (windSpeed <= 8) {
			hourScore += 2;
			factors.push("Light winds");
		} else if (windSpeed <= 15) {
			hourScore += 1.5;
			factors.push("Moderate winds");
		} else if (windSpeed <= 25) {
			hourScore += 0.5;
			factors.push("Strong winds");
		}

		// Tide factor (0-2 points) - simplified
		if (tideData && spot.bestTide) {
			const bestTide = spot.bestTide.toLowerCase();
			// Simulate tide level for this hour (0-1 scale)
			const tideLevel =
				0.5 + 0.5 * Math.cos((hour / 12.42) * 2 * Math.PI);

			if (bestTide === "all" || bestTide === "any") {
				hourScore += 2;
				factors.push("Good for all tides");
			} else if (bestTide === "low" && tideLevel <= 0.4) {
				hourScore += 2;
				factors.push("Perfect low tide");
			} else if (
				bestTide === "mid" &&
				tideLevel >= 0.3 &&
				tideLevel <= 0.7
			) {
				hourScore += 2;
				factors.push("Perfect mid tide");
			} else if (bestTide === "high" && tideLevel >= 0.6) {
				hourScore += 2;
				factors.push("Perfect high tide");
			} else {
				hourScore += 0.5;
				factors.push("Suboptimal tide");
			}
		} else {
			hourScore += 1; // Neutral
		}

		// Enhanced daylight bonus with sunrise/sunset + 1 hour buffer
		let isGoodLight = false;

		if (sunriseHour !== null && sunsetHour !== null) {
			const safeStartHour = Math.max(0, sunriseHour - 1); // 1 hour before sunrise
			const safeEndHour = Math.min(24, sunsetHour + 1); // 1 hour after sunset

			if (hour >= safeStartHour && hour <= safeEndHour) {
				if (hour >= sunriseHour - 0.5 && hour <= sunsetHour + 0.5) {
					hourScore += 1.0; // Full daylight
					factors.push("Perfect daylight");
					isGoodLight = true;
				} else {
					hourScore += 0.5; // Twilight buffer (dawn/dusk)
					factors.push("Good light (dawn/dusk)");
					isGoodLight = true;
				}
			} else {
				// Dark hours - significant penalty for safety
				hourScore *= 0.3; // Reduce total score by 70%
				factors.push("Dark - unsafe conditions");
			}
		} else {
			// Fallback to simple time if sunrise/sunset calculation fails
			if (hour >= 6 && hour <= 18) {
				hourScore += 0.5;
				factors.push("Daylight hours");
				isGoodLight = true;
			} else {
				hourScore *= 0.3;
				factors.push("Dark hours");
			}
		}

		scores.push({
			hour,
			score: Math.min(hourScore, 10.0),
			factors: factors.slice(0, 3),
			time: `${hour.toString().padStart(2, "0")}:00`,
		});
	}

	// Find the best time slots
	const sortedTimes = scores.sort((a, b) => b.score - a.score);
	const bestTime = sortedTimes[0];

	// Find consecutive good hours (score > 6) with good lighting conditions
	const goodHours = scores.filter(
		(s) => s.score >= 6.0 && !s.factors.includes("Dark - unsafe conditions")
	);
	let bestWindow = null;

	if (goodHours.length >= 2) {
		// Look for consecutive hours with good surf and lighting
		for (let i = 0; i < goodHours.length - 1; i++) {
			const current = goodHours[i];
			const next = goodHours[i + 1];
			if (Math.abs(current.hour - next.hour) === 1) {
				bestWindow = {
					start: Math.min(current.hour, next.hour),
					end: Math.max(current.hour, next.hour),
					startTime: `${Math.min(current.hour, next.hour).toString().padStart(2, "0")}:00`,
					endTime: `${(Math.max(current.hour, next.hour) + 1).toString().padStart(2, "0")}:00`,
					hasGoodLight: true,
				};
				break;
			}
		}
	}

	return {
		bestTime: bestTime,
		bestWindow: bestWindow,
		allHours: scores,
	};
}

function processHourlyToDaily(marineData, windData, tideData) {
	const times = marineData.hourly?.time || [];
	const dailyData = [];

	// Group by day
	const days = {};
	times.forEach((time, index) => {
		const date = time.split("T")[0];
		if (!days[date]) {
			days[date] = {
				date,
				waveHeight: [],
				swellHeight: [],
				period: [],
				swellDirection: [],
				windSpeed: [],
				windDirection: [],
				tideData: tideData, // Add tide data to each day
			};
		}

		days[date].waveHeight.push(marineData.hourly.wave_height[index]);
		days[date].swellHeight.push(marineData.hourly.swell_wave_height[index]);
		days[date].period.push(
			marineData.hourly.swell_wave_period[index] ||
				marineData.hourly.wave_period[index]
		);
		days[date].swellDirection.push(
			marineData.hourly.swell_wave_direction[index] ||
				marineData.hourly.wave_direction[index]
		);
		days[date].windSpeed.push(windData.hourly.wind_speed_10m[index]);
		days[date].windDirection.push(
			windData.hourly.wind_direction_10m[index]
		);
	});

	return Object.values(days);
}

exports.handler = async (event, context) => {
	// Enhanced headers with smart caching strategy
	const headers = {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Headers": "Content-Type",
		"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
		"Content-Type": "application/json",
		// Cache for 1 hour in browser, but allow stale content for 4 hours
		"Cache-Control": "public, max-age=3600, stale-while-revalidate=14400",
		// Add ETag for better cache validation
		"X-Cache-Strategy": "enhanced-8h-server-1h-browser",
		// Vary header for different requests
		Vary: "Accept-Encoding",
	};

	if (event.httpMethod === "OPTIONS") {
		return {
			statusCode: 200,
			headers: {
				...headers,
				"Cache-Control": "public, max-age=86400", // Cache preflight for 24h
			},
		};
	}

	try {
		const { lat, lng, spotName } = event.queryStringParameters || {};

		if (!lat || !lng) {
			return {
				statusCode: 400,
				headers,
				body: JSON.stringify({
					error: "Latitude and longitude are required",
				}),
			};
		}

		const latitude = parseFloat(lat);
		const longitude = parseFloat(lng);

		// Find the spot data
		const spot = surfSpotsData.find(
			(s) =>
				s.name.toLowerCase().replace(/\s+/g, "-") ===
					spotName?.toLowerCase() ||
				(Math.abs(s.latitude - latitude) < 0.01 &&
					Math.abs(s.longitude - longitude) < 0.01)
		);

		// Get 5-day forecast and tide data
		const [forecastData, tideData] = await Promise.all([
			get5DayForecast(latitude, longitude),
			getTideData(latitude, longitude),
		]);

		if (!forecastData) {
			return {
				statusCode: 500,
				headers,
				body: JSON.stringify({
					error: "Failed to fetch forecast data",
				}),
			};
		}

		// Process hourly to daily
		const dailyData = processHourlyToDaily(
			forecastData.marineData,
			forecastData.windData,
			tideData
		);

		// Calculate scores for each day
		const forecast = dailyData.map((dayData) => {
			const dayScore = calculateDaySurfScore(dayData, spot || {});

			// Format date
			const date = new Date(dayData.date);
			const dayName = date.toLocaleDateString("en-GB", {
				weekday: "long",
			});
			const dateStr = date.toLocaleDateString("en-GB", {
				month: "short",
				day: "numeric",
			});

			// Create hourly data for this day
			const hourlyData = {
				waveHeight: dayData.waveHeight,
				period: dayData.period,
				windSpeed: dayData.windSpeed,
				windDirection: dayData.windDirection,
				swellDirection: dayData.swellDirection,
				times: Array.from({ length: 24 }, (_, hour) => {
					const hourDate = new Date(date);
					hourDate.setHours(hour, 0, 0, 0);
					return hourDate.toISOString();
				}),
			};

			// Calculate best time for this specific day
			const bestTimeAnalysis = calculateBestTimeOfDay(
				hourlyData,
				spot || {},
				dayScore.tideData,
				latitude,
				longitude,
				date
			);

			return {
				date: dayData.date,
				dayName,
				dateStr,
				score: dayScore.score,
				waveHeight: dayScore.waveHeight,
				period: dayScore.period,
				windSpeed: dayScore.windSpeed,
				factors: dayScore.factors,
				tideData: dayScore.tideData,
				hourlyData: hourlyData,
				bestTime: bestTimeAnalysis, // Add best time data for each day
				rating:
					dayScore.score >= 7
						? "Excellent"
						: dayScore.score >= 5.5
							? "Good"
							: dayScore.score >= 4
								? "Average"
								: dayScore.score >= 2
									? "Poor"
									: "Very Poor",
			};
		});

		// Add cache metadata for debugging and monitoring
		const cacheStats = {
			tideCacheSize: tideCache.size,
			apiUsageToday:
				apiUsageTracker.get(new Date().toISOString().split("T")[0]) ||
				0,
			cacheStrategy: `${CACHE_CONFIG.TIDE_EXTREMES_DAYS}-day extremes cache + full API quota usage`,
		};

		return {
			statusCode: 200,
			headers: {
				...headers,
				// Add cache hit/miss information
				"X-Cache-Stats": JSON.stringify(cacheStats),
				"X-Generated-At": new Date().toISOString(),
			},
			body: JSON.stringify({
				spot: spot || {
					name: spotName || "Unknown Spot",
					latitude,
					longitude,
				},
				forecast,
				timestamp: new Date().toISOString(),
				cacheInfo: {
					extremesCacheDays: CACHE_CONFIG.TIDE_EXTREMES_DAYS,
					apiCallsToday: cacheStats.apiUsageToday,
					dailyLimit: CACHE_CONFIG.API_DAILY_LIMIT,
					strategy:
						"Balanced: 3-day extremes cache + full API quota utilization",
				},
			}),
		};
	} catch (error) {
		console.error("Function error:", error);
		return {
			statusCode: 500,
			headers,
			body: JSON.stringify({ error: "Internal server error" }),
		};
	}
};
