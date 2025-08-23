// Embed surf spots data directly to avoid file path issues in Netlify
const surfSpotsData = [
	{
		name: "Fistral Beach",
		latitude: 50.4161,
		longitude: -5.0931,
		region: "Cornwall",
		skillLevel: "Intermediate",
		optimalSwellDir: [270, 315],
		optimalWindDir: [45, 135],
		faces: "N",
		bestTide: "mid",
		breakType: "beach",
		reliability: "Very Consistent",
		hazards: "crowded, rips",
		bestConditions:
			"Best conditions occur when west-southwest swell combines with offshore wind from southeast",
		description:
			"Fistral Beach is Cornwall's most famous surf spot. This fairly exposed beach break has consistent surf and is rarely flat.",
	},
	{
		name: "Watergate Bay",
		latitude: 50.4425,
		longitude: -5.0394,
		region: "Cornwall",
		skillLevel: "Beginner",
		optimalSwellDir: [270, 315],
		optimalWindDir: [90, 180],
		faces: "NW",
		bestTide: "low_to_mid",
		breakType: "beach",
		reliability: "Consistent",
		hazards: "rips",
		bestConditions:
			"Best conditions occur when northwest swell combines with offshore wind from southeast",
		description:
			"Two mile long sandy beach offering excellent surf for all levels.",
	},
	{
		name: "Polzeath",
		latitude: 50.5689,
		longitude: -4.9156,
		region: "Cornwall",
		skillLevel: "Beginner",
		optimalSwellDir: [270, 330],
		optimalWindDir: [135, 225],
		faces: "NW",
		bestTide: "mid_to_high",
		breakType: "beach",
		reliability: "Consistent",
		hazards: "crowded",
		bestConditions:
			"Best conditions occur when northwest swell combines with offshore wind from southeast to south",
		description:
			"Protected sandy bay that's popular with families and surf schools.",
	},
	{
		name: "Croyde Bay",
		latitude: 51.1261,
		longitude: -4.2394,
		region: "Devon",
		skillLevel: "Beginner",
		optimalSwellDir: [270, 330],
		optimalWindDir: [90, 180],
		faces: "NW",
		bestTide: "mid",
		breakType: "beach",
		reliability: "Very Consistent",
		hazards: "crowded, rips",
		bestConditions:
			"Best conditions occur when west-northwest swell combines with offshore wind from southeast",
		description: "Picturesque bay with consistent surf year-round.",
	},
	{
		name: "Woolacombe",
		latitude: 51.1833,
		longitude: -4.2167,
		region: "Devon",
		skillLevel: "Beginner",
		optimalSwellDir: [270, 330],
		optimalWindDir: [90, 180],
		faces: "NW",
		bestTide: "all",
		breakType: "beach",
		reliability: "Very Consistent",
		hazards: "rips",
		bestConditions:
			"Best conditions occur when west-northwest swell combines with offshore wind from southeast",
		description:
			"Three mile stretch of golden sand that works on all tides.",
	},
];

console.log(
	"Netlify Function: find-surf-spots loaded with",
	surfSpotsData.length,
	"spots"
);

// Helper functions
function calculateDistance(lat1, lng1, lat2, lng2) {
	const R = 6371; // Earth's radius in km

	const lat1Rad = (lat1 * Math.PI) / 180;
	const lat2Rad = (lat2 * Math.PI) / 180;
	const deltaLat = ((lat2 - lat1) * Math.PI) / 180;
	const deltaLng = ((lng2 - lng1) * Math.PI) / 180;

	const a =
		Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
		Math.cos(lat1Rad) *
			Math.cos(lat2Rad) *
			Math.sin(deltaLng / 2) *
			Math.sin(deltaLng / 2);

	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

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

async function getTideData(latitude, longitude) {
	try {
		// UK Admiralty API - Official UK Government Tide Data
		// const admiraltyApiKey = process.env.ADMIRALTY_API_KEY;

		// console.log(
		// 	`🔑 Find-spots API Key check: ${admiraltyApiKey ? "PRESENT" : "MISSING"}`
		// );

		// Disabled API key checking for clean setup
		if (false) {
			try {
				console.log(
					`🇬🇧 Find-spots: Fetching tide data from UK Admiralty API for: ${latitude}, ${longitude}`
				);

				// First, find the nearest tidal station
				const stationsResponse = await fetch(
					"https://admiraltyapi.azure-api.net/uktidalapi/api/V1/Stations",
					{
						headers: {
							"Ocp-Apim-Subscription-Key": admiraltyApiKey,
							"Content-Type": "application/json",
						},
					}
				);

				if (!stationsResponse.ok) {
					throw new Error(
						`Stations API error: ${stationsResponse.status}`
					);
				}

				const stationsData = await stationsResponse.json();

				// Find closest station
				let closestStation = null;
				let minDistance = Infinity;

				if (stationsData.features) {
					stationsData.features.forEach((station) => {
						if (station.geometry && station.geometry.coordinates) {
							const stationLng = station.geometry.coordinates[0];
							const stationLat = station.geometry.coordinates[1];

							const distance = Math.sqrt(
								Math.pow(stationLat - latitude, 2) +
									Math.pow(stationLng - longitude, 2)
							);

							if (distance < minDistance) {
								minDistance = distance;
								closestStation = station;
							}
						}
					});
				}

				if (!closestStation) {
					throw new Error("No suitable tidal station found");
				}

				console.log(
					`📍 Find-spots: Using station: ${closestStation.properties.Name} (${(minDistance * 111).toFixed(1)}km away)`
				);

				// Get tide data for today and tomorrow
				const today = new Date().toISOString().split("T")[0];
				const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
					.toISOString()
					.split("T")[0];

				const tideResponse = await fetch(
					`https://admiraltyapi.azure-api.net/uktidalapi/api/V1/Stations/${closestStation.properties.Id}/TidalEvents?StartDateTime=${today}&EndDateTime=${tomorrow}`,
					{
						headers: {
							"Ocp-Apim-Subscription-Key": admiraltyApiKey,
							"Content-Type": "application/json",
						},
					}
				);

				if (!tideResponse.ok) {
					throw new Error(
						`Tide data API error: ${tideResponse.status}`
					);
				}

				const tideEvents = await tideResponse.json();
				console.log(
					`✅ Find-spots Admiralty API success: ${tideEvents.length} tide events fetched`
				);

				// Process Admiralty data using the same function as get-forecast
				const now = new Date();
				return processAdmiraltyTideDataFindSpots(tideEvents, now);
			} catch (admiraltyError) {
				console.log(
					`❌ Find-spots Admiralty API error: ${admiraltyError.message}`
				);
				// Fall through to enhanced calculation below
			}
		} else {
			console.log(
				"⚠️ Find-spots: No Admiralty API key found - using enhanced calculation"
			);
		}

		// Fallback to enhanced harmonic calculation if API fails
		console.log(
			`🧮 Find-spots: Using enhanced tidal calculation for ${latitude}, ${longitude}`
		);
		return getEnhancedTideCalculationFindSpots(latitude, longitude);
	} catch (error) {
		console.error(`❌ Find-spots Error in getTideData: ${error.message}`);
		return getEnhancedTideCalculationFindSpots(latitude, longitude);
	}
}

// Process UK Admiralty tide data - official UK government data (for find-surf-spots)
function processAdmiraltyTideDataFindSpots(tideEvents, now) {
	let currentLevel = 0.5;
	let isRising = true;
	let nextHigh = null;
	let nextLow = null;

	if (tideEvents && tideEvents.length > 0) {
		const currentTime = now.getTime();

		// Find next high and low tide times
		const futureEvents = tideEvents
			.filter((event) => new Date(event.DateTime).getTime() > currentTime)
			.sort((a, b) => new Date(a.DateTime) - new Date(b.DateTime));

		for (const event of futureEvents) {
			if (event.EventType === "HighWater" && !nextHigh) {
				nextHigh = new Date(event.DateTime);
			} else if (event.EventType === "LowWater" && !nextLow) {
				nextLow = new Date(event.DateTime);
			}
		}

		// Calculate current tide level using improved cosine interpolation
		const allEvents = tideEvents.sort(
			(a, b) => new Date(a.DateTime) - new Date(b.DateTime)
		);

		// Find the interval containing current time
		let intervalFound = false;
		for (let i = 0; i < allEvents.length - 1; i++) {
			const currentEvent = allEvents[i];
			const nextEvent = allEvents[i + 1];
			const currentEventTime = new Date(currentEvent.DateTime).getTime();
			const nextEventTime = new Date(nextEvent.DateTime).getTime();

			if (
				currentEventTime <= currentTime &&
				currentTime <= nextEventTime
			) {
				intervalFound = true;
				const progress =
					(currentTime - currentEventTime) /
					(nextEventTime - currentEventTime);

				// Use actual height data if available
				const currentHeight = currentEvent.Height || 0;
				const nextHeight = nextEvent.Height || 0;
				const maxHeight = Math.max(
					...tideEvents.map((e) => e.Height || 0)
				);
				const minHeight = Math.min(
					...tideEvents.map((e) => e.Height || 0)
				);

				if (
					currentEvent.EventType === "HighWater" &&
					nextEvent.EventType === "LowWater"
				) {
					// Falling tide: HIGH → LOW - use inverted cosine curve
					const smoothProgress =
						(1 + Math.cos(progress * Math.PI)) / 2;
					const interpolatedHeight =
						currentHeight +
						(nextHeight - currentHeight) * smoothProgress;
					currentLevel =
						(interpolatedHeight - minHeight) /
						(maxHeight - minHeight);
					isRising = false;
				} else if (
					currentEvent.EventType === "LowWater" &&
					nextEvent.EventType === "HighWater"
				) {
					// Rising tide: LOW → HIGH - use standard cosine curve
					const smoothProgress =
						(1 - Math.cos(progress * Math.PI)) / 2;
					const interpolatedHeight =
						currentHeight +
						(nextHeight - currentHeight) * smoothProgress;
					currentLevel =
						(interpolatedHeight - minHeight) /
						(maxHeight - minHeight);
					isRising = true;
				}
				break;
			}
		}

		// If no interval found, determine direction based on next event
		if (!intervalFound && futureEvents.length > 0) {
			const nextEvent = futureEvents[0];
			isRising = nextEvent.EventType === "HighWater";

			// Estimate current level based on time to next event
			const timeToNext =
				new Date(nextEvent.DateTime).getTime() - currentTime;
			const typicalTideInterval = 6.2 * 60 * 60 * 1000; // ~6.2 hours
			const progressToNext = Math.min(
				timeToNext / typicalTideInterval,
				1
			);

			if (nextEvent.EventType === "HighWater") {
				// Rising towards high tide
				currentLevel = 0.2 + (1 - progressToNext) * 0.65;
			} else {
				// Falling towards low tide
				currentLevel = 0.85 - (1 - progressToNext) * 0.65;
			}
		}
	}

	return {
		currentLevel: Math.max(0.05, Math.min(0.95, currentLevel)),
		isRising: isRising,
		nextHigh: nextHigh || new Date(now.getTime() + 6 * 3600000),
		nextLow: nextLow || new Date(now.getTime() + 3 * 3600000),
		source: "admiralty_uk",
		// Include the raw tide events for frontend chart generation
		tideEvents: tideEvents
			? tideEvents.map((event) => ({
					time: event.DateTime,
					type: event.EventType === "HighWater" ? "high" : "low",
					height: event.Height,
				}))
			: [],
	};
}

// Enhanced harmonic calculation fallback (for find-surf-spots)
function getEnhancedTideCalculationFindSpots(latitude, longitude) {
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

async function getSurfConditions(latitude, longitude) {
	try {
		// Marine weather data
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
		marineUrl.searchParams.set("forecast_days", "1");

		// Wind data
		const windUrl = new URL("https://api.open-meteo.com/v1/forecast");
		windUrl.searchParams.set("latitude", latitude);
		windUrl.searchParams.set("longitude", longitude);
		windUrl.searchParams.set("hourly", "wind_speed_10m,wind_direction_10m");
		windUrl.searchParams.set("timezone", "Europe/London");
		windUrl.searchParams.set("forecast_days", "1");

		// Get tide data
		const tideData = await getTideData(latitude, longitude);

		const [marineResponse, windResponse] = await Promise.all([
			fetch(marineUrl),
			fetch(windUrl),
		]);

		const marineData = await marineResponse.json();
		const windData = await windResponse.json();

		// Get current hour index
		const now = new Date();
		const currentHourStr = now.toISOString().slice(0, 13) + ":00";

		const times = marineData.hourly?.time || [];
		let currentIdx = 0;

		for (let i = 0; i < times.length; i++) {
			if (times[i] <= currentHourStr) {
				currentIdx = i;
			} else {
				break;
			}
		}

		return {
			waveHeight: marineData.hourly?.wave_height?.[currentIdx],
			swellWaveHeight: marineData.hourly?.swell_wave_height?.[currentIdx],
			windWaveHeight: marineData.hourly?.wind_wave_height?.[currentIdx],
			waveDirection: marineData.hourly?.wave_direction?.[currentIdx],
			swellWaveDirection:
				marineData.hourly?.swell_wave_direction?.[currentIdx],
			wavePeriod: marineData.hourly?.wave_period?.[currentIdx],
			swellWavePeriod: marineData.hourly?.swell_wave_period?.[currentIdx],
			windSpeed: windData.hourly?.wind_speed_10m?.[currentIdx],
			windDirection: windData.hourly?.wind_direction_10m?.[currentIdx],
			tideData: tideData,
			timestamp: times[currentIdx],
		};
	} catch (error) {
		console.error("Error fetching conditions:", error);
		return null;
	}
}

function calculateBestTimeOfDay(
	hourlyData,
	spot,
	tideData,
	latitude = 50.4,
	longitude = -5.0
) {
	const scores = [];

	// Calculate sunrise and sunset times
	const today = new Date();
	const dayOfYear = Math.floor(
		(today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) /
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

function calculateSurfScore(conditions, spot) {
	if (!conditions) return { score: 0, description: "No data available" };

	let score = 0;
	const factors = [];

	// Wave height scoring (0-4 points) - More weight given to this key factor
	const waveHeight = conditions.waveHeight || 0;
	const swellHeight = conditions.swellWaveHeight || 0;
	const effectiveHeight = Math.max(waveHeight, swellHeight);

	let heightScore;
	// Skill level adjusted scoring
	const isBeginnerSpot = spot.skillLevel?.toLowerCase().includes("beginner");
	const isAdvancedSpot = spot.skillLevel?.toLowerCase().includes("advanced");

	if (isBeginnerSpot) {
		// Beginners prefer smaller, manageable waves
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
		// Advanced spots can handle bigger waves
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
		// Intermediate spots - balanced approach
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

	// Wave period scoring (0-2.5 points) - Enhanced importance
	const period = conditions.swellWavePeriod || conditions.wavePeriod || 0;
	let periodScore;
	if (period >= 10 && period <= 14) {
		periodScore = 2.5;
		factors.push("Premium groundswell");
	} else if (period >= 8 && period < 10) {
		periodScore = 2;
		factors.push("Good groundswell");
	} else if ((period >= 6 && period < 8) || (period > 14 && period <= 18)) {
		periodScore = 1.5;
		factors.push("Decent swell period");
	} else if (period >= 4 && period < 6) {
		periodScore = 0.8;
		factors.push("Short period windswell");
	} else if (period > 0) {
		periodScore = 0.3;
		factors.push("Very short period");
	} else {
		periodScore = 0;
	}
	score += periodScore;

	// Swell direction scoring (0-2.5 points) - Slightly reduced weight
	const swellDir = conditions.swellWaveDirection || conditions.waveDirection;
	if (swellDir && spot.optimalSwellDir) {
		const swellScoreFactor = directionScore(swellDir, spot.optimalSwellDir);
		const swellScore = 2.5 * swellScoreFactor;
		score += swellScore;

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
		factors.push("Unknown swell direction");
	}

	// Wind direction scoring (0-2 points) - Enhanced wind assessment
	const windSpeed = conditions.windSpeed || 0;
	const windDir = conditions.windDirection;

	if (windSpeed <= 8) {
		score += 2;
		factors.push("Light winds - glassy conditions");
	} else if (windDir && spot.optimalWindDir) {
		const windScoreFactor = directionScore(windDir, spot.optimalWindDir);

		if (windSpeed <= 15) {
			const windScore = 2 * windScoreFactor;
			score += windScore;

			if (windScoreFactor >= 0.9) {
				factors.push("Perfect offshore winds!");
			} else if (windScoreFactor >= 0.7) {
				factors.push("Good offshore wind");
			} else if (windScoreFactor >= 0.3) {
				factors.push("Side/cross winds");
			} else {
				factors.push("Onshore winds - bumpy");
			}
		} else if (windSpeed <= 25) {
			score += windScoreFactor * 0.8;
			factors.push("Strong winds");
		} else {
			score += 0.2;
			factors.push("Very strong winds");
		}
	} else {
		score += 1;
		factors.push("Unknown wind conditions");
	}

	// Generate description with enhanced thresholds
	let description;
	if (score >= 8.5) {
		description = `🔥 FIRING! Epic conditions at ${spot.name}. ${factors.join(", ")}`;
	} else if (score >= 7) {
		description = `🌊 Excellent surf at ${spot.name}. ${factors.join(", ")}`;
	} else if (score >= 5.5) {
		description = `👍 Good session potential at ${spot.name}. ${factors.join(", ")}`;
	} else if (score >= 4) {
		description = `⚠️ Average conditions. ${factors.join(", ")}`;
	} else if (score >= 2) {
		description = `😐 Below average conditions. ${factors.join(", ")}`;
	} else {
		description = `💤 Poor conditions. ${factors.join(", ")}`;
	}

	// Tide scoring (0-2 points) - New tide timing factor
	let tideScore = 0;
	if (conditions.tideData && spot.bestTide) {
		const tideLevel = conditions.tideData.currentLevel; // 0-1 scale
		const bestTide = spot.bestTide.toLowerCase();

		if (bestTide === "all" || bestTide === "any") {
			tideScore = 2;
			factors.push("Works on all tides");
		} else if (bestTide === "low" || bestTide === "low_to_mid") {
			// Low tide preference (0-0.3 is low, 0.3-0.6 is low-mid)
			if (tideLevel <= 0.3) {
				tideScore = 2;
				factors.push("Perfect low tide!");
			} else if (tideLevel <= 0.6) {
				tideScore = 1.5;
				factors.push("Good low-mid tide");
			} else {
				tideScore = 0.5;
				factors.push("High tide - not optimal");
			}
		} else if (bestTide === "mid" || bestTide === "mid_tide") {
			// Mid tide preference (0.3-0.7 is optimal)
			if (tideLevel >= 0.3 && tideLevel <= 0.7) {
				tideScore = 2;
				factors.push("Perfect mid tide!");
			} else if (tideLevel <= 0.2 || tideLevel >= 0.8) {
				tideScore = 0.5;
				factors.push("Extreme tide - not optimal");
			} else {
				tideScore = 1.2;
				factors.push("Decent tide level");
			}
		} else if (bestTide === "high" || bestTide === "mid_to_high") {
			// High tide preference (0.6-1.0 is high, 0.4-0.8 is mid-high)
			if (tideLevel >= 0.7) {
				tideScore = 2;
				factors.push("Perfect high tide!");
			} else if (tideLevel >= 0.4) {
				tideScore = 1.5;
				factors.push("Good mid-high tide");
			} else {
				tideScore = 0.5;
				factors.push("Low tide - not optimal");
			}
		} else {
			tideScore = 1; // Unknown tide preference
		}

		// Add tide direction factor
		if (conditions.tideData.isRising) {
			factors.push("Tide rising");
		} else {
			factors.push("Tide falling");
		}
	} else {
		tideScore = 1; // Neutral score when no tide data available
	}
	score += tideScore;

	// Reliability bonus (0-1 points)
	let reliabilityBonus = 0;
	if (spot.reliability) {
		const reliability = spot.reliability.toLowerCase();
		if (reliability.includes("very consistent")) {
			reliabilityBonus = 1;
			factors.push("Very reliable spot");
		} else if (reliability.includes("consistent")) {
			reliabilityBonus = 0.7;
			factors.push("Reliable spot");
		} else if (reliability.includes("seasonal")) {
			reliabilityBonus = 0.3;
			factors.push("Seasonal reliability");
		}
	}
	score += reliabilityBonus;

	return { score: Math.min(Math.round(score * 10) / 10, 10.0), description };
}

exports.handler = async (event, context) => {
	console.log("Function called:", event.httpMethod, event.path);

	const headers = {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Headers": "Content-Type",
		"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
		"Content-Type": "application/json",
	};

	if (event.httpMethod === "OPTIONS") {
		return { statusCode: 200, headers };
	}

	try {
		const {
			latitude,
			longitude,
			maxDistance = 100,
		} = JSON.parse(event.body || "{}"); // 100km = ~62 miles

		if (!latitude || !longitude) {
			return {
				statusCode: 400,
				headers,
				body: JSON.stringify({
					error: "Latitude and longitude are required",
				}),
			};
		}

		// Find nearby spots
		const nearbySpots = surfSpotsData
			.map((spot) => ({
				...spot,
				distance: calculateDistance(
					latitude,
					longitude,
					spot.latitude,
					spot.longitude
				),
			}))
			.filter((spot) => spot.distance <= maxDistance)
			.sort((a, b) => a.distance - b.distance);

		if (nearbySpots.length === 0) {
			return {
				statusCode: 200,
				headers,
				body: JSON.stringify({
					spots: [],
					message: "No surf spots found nearby",
				}),
			};
		}

		// Get conditions for each spot
		const spotsWithConditions = await Promise.all(
			nearbySpots.map(async (spot) => {
				const conditions = await getSurfConditions(
					spot.latitude,
					spot.longitude
				);
				const { score, description } = calculateSurfScore(
					conditions,
					spot
				);

				// Use real marine data from API (24 hours)
				let hourlyData;
				try {
					if (marineData?.hourly?.time && marineData.hourly.time.length >= 24) {
					// Transform real marine API data to expected format
					hourlyData = {
						waveHeight: marineData.hourly.wave_height?.slice(0, 24) || Array(24).fill(1.0),
						period: marineData.hourly.swell_wave_period?.slice(0, 24) || 
								marineData.hourly.wave_period?.slice(0, 24) || 
								Array(24).fill(8.0),
						windSpeed: windData.hourly?.wind_speed_10m ? windData.hourly.wind_speed_10m.slice(0, 24).map(ws => (ws || 0) * 3.6) : Array(24).fill(15.0), // Convert m/s to km/h
						windDirection: windData.hourly?.wind_direction_10m ? windData.hourly.wind_direction_10m.slice(0, 24) : Array(24).fill(225),
						times: marineData.hourly.time.slice(0, 24).map(time => {
							const date = new Date(time);
							return `${date.getHours().toString().padStart(2, '0')}:00`;
						}),
					};
					console.log(`🌊 Using real marine data for ${spot.name}: ${hourlyData.waveHeight.length} hours`);
					} else {
						throw new Error('Marine data not available or insufficient');
					}
				} catch (marineError) {
					// Fallback to mock data if marine API processing failed
					console.warn(`⚠️ Marine data error for ${spot.name}: ${marineError.message}, using fallback`);
					const today = new Date();
					hourlyData = {
						waveHeight: Array.from({ length: 24 }, (_, hour) => {
							const baseHeight = conditions?.waveHeight || 1.0;
							const variation = Math.sin((hour / 24) * Math.PI * 2) * 0.3;
							return Math.max(0.2, baseHeight + variation + (Math.random() * 0.2 - 0.1));
						}),
						period: Array.from({ length: 24 }, (_, hour) => {
							const basePeriod = conditions?.swellWavePeriod || conditions?.wavePeriod || 8;
							const variation = Math.sin((hour / 24) * Math.PI * 2 + Math.PI / 3) * 2;
							return Math.max(4, basePeriod + variation + (Math.random() * 1 - 0.5));
						}),
						windSpeed: Array.from({ length: 24 }, (_, hour) => {
							const baseWind = (conditions?.windSpeed || 10) * 3.6; // Convert to km/h
							const variation = Math.sin((hour / 24) * Math.PI * 2 + Math.PI / 6) * 5;
							return Math.max(0, baseWind + variation + (Math.random() * 2 - 1));
						}),
						windDirection: Array.from({ length: 24 }, () => 
							conditions?.windDirection || 225 + (Math.random() * 60 - 30)
						),
						times: Array.from({ length: 24 }, (_, hour) => `${hour.toString().padStart(2, '0')}:00`),
					};
				}

				// Calculate best time of day
				const bestTimeAnalysis = calculateBestTimeOfDay(
					hourlyData,
					spot,
					conditions?.tideData,
					spot.latitude,
					spot.longitude
				);

				// Transform hourlyData to array format for frontend charts
				const hourlyDataArray = hourlyData.times.map((time, index) => ({
					hour: new Date(`2000-01-01T${time}`).getHours(),
					time: time,
					waveHeight: hourlyData.waveHeight[index] || 0,
					period: hourlyData.period[index] || 8,
					windSpeed: hourlyData.windSpeed[index] || 15,
					windDirection: hourlyData.windDirection[index] || 225,
					swellDirection: hourlyData.windDirection[index] || 270, // Use wind direction as fallback
					swellHeight: hourlyData.waveHeight[index] * 0.8 || 0, // Estimate swell as portion of total wave
					tideLevel: 0.5, // Default mid-tide
				}));

				return {
					...spot,
					conditions,
					surfScore: score,
					surfDescription: description,
					waveHeight: conditions?.waveHeight || 0,
					windSpeed: conditions?.windSpeed || 0,
					tideData: conditions?.tideData || null,
					hourlyData: hourlyDataArray,
					bestTime: bestTimeAnalysis,
				};
			})
		);

		// Sort by surf score
		spotsWithConditions.sort((a, b) => b.surfScore - a.surfScore);

		return {
			statusCode: 200,
			headers,
			body: JSON.stringify({
				spots: spotsWithConditions.slice(0, 10), // Top 10 spots within 100km
				timestamp: new Date().toISOString(),
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
