import {
	calculateSurfScore,
	getScoreRating,
	type SurfConditions,
	type SpotData,
} from "./surfScore";

export interface TideData {
	currentLevel: number;
	isRising: boolean;
	nextHigh: Date;
	nextLow: Date;
	source?: string;
	tideEvents?: Array<{
		time: string;
		type: "high" | "low";
		height: number;
	}>;
}

export interface MockSurfConditions extends SurfConditions {
	tideData: TideData;
}

/**
 * Seeded random number generator for consistent results
 */
export const seededRandom = (seed: number): number => {
	const x = Math.sin(seed) * 10000;
	return x - Math.floor(x);
};

/**
 * Generates consistent mock surf conditions based on a seed
 */
export const generateMockSurfConditions = (
	seed: number
): MockSurfConditions => {
	const waveHeight = 0.3 + seededRandom(seed * 1.3) * 2.2; // 0.3-2.5m
	const period = 6 + seededRandom(seed * 1.9) * 8; // 6-14s
	const windSpeed = seededRandom(seed * 1.7) * 25; // 0-25 km/h
	const windDirection = 90 + seededRandom(seed * 2.1) * 180; // 90-270 degrees
	const swellDirection = 270 + seededRandom(seed * 2.3) * 90; // 270-360 degrees
	const tideLevel = seededRandom(seed * 2.7); // 0-1 scale
	const tideRising = seededRandom(seed * 3.1) > 0.5;

	// Generate realistic tide events for today
	const generateTideEvents = () => {
		const now = new Date();
		const startOfDay = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
			0,
			0,
			0
		);
		const events = [];

		// Typical UK tide pattern: 2 highs and 2 lows per day, ~6 hours apart
		const baseOffset = seededRandom(seed * 4.1) * 3; // Random start offset 0-3 hours

		for (let i = 0; i < 4; i++) {
			const eventTime = new Date(
				startOfDay.getTime() + (baseOffset + i * 6.2) * 3600000
			);
			const isHigh = i % 2 === 0;
			const baseHeight = isHigh
				? 3.8 + seededRandom(seed * (5.1 + i)) * 1.2
				: 0.8 + seededRandom(seed * (6.3 + i)) * 0.8;

			if (eventTime.getDate() === now.getDate()) {
				// Only include events for today
				events.push({
					time: eventTime.toISOString(),
					type: (isHigh ? "high" : "low") as "high" | "low",
					height: Number(baseHeight.toFixed(1)),
				});
			}
		}

		return events.slice(0, 4); // Maximum 4 events per day
	};

	const tideEvents = generateTideEvents();

	return {
		waveHeight,
		period,
		windSpeed,
		windDirection,
		swellDirection,
		tideLevel,
		tideData: {
			currentLevel: tideLevel,
			isRising: tideRising,
			nextHigh: new Date(Date.now() + (tideRising ? 3 : 9) * 3600000), // 3-9 hours from now
			nextLow: new Date(Date.now() + (tideRising ? 9 : 3) * 3600000),
			source: "admiralty_uk",
			tideEvents: tideEvents,
		},
	};
};

/**
 * Creates an enriched spot with mock surf conditions and calculated score
 */
export const createEnrichedSpot = (
	spot: any,
	seed: number,
	userLocation?: { latitude: number; longitude: number }
) => {
	const mockConditions = generateMockSurfConditions(seed);

	// Calculate distance if user location is provided
	let distance = 0;
	if (userLocation) {
		distance = calculateDistance(
			userLocation.latitude,
			userLocation.longitude,
			spot.latitude,
			spot.longitude
		);
	}

	// Create spot data for scoring
	const spotData: SpotData = {
		optimalWindDir: spot.optimalWindDir,
		optimalSwellDir: spot.optimalSwellDir,
		bestTide: spot.bestTide,
	};

	// Calculate surf score
	const surfScore = calculateSurfScore(mockConditions, spotData);
	const rating = getScoreRating(surfScore);

	// Generate intelligent factors based on conditions
	const factors = generateSurfFactors(mockConditions, spotData, surfScore);

	// Generate hourly data for the current day (24 hours)
	const hourlyData = {
		waveHeight: Array.from({ length: 24 }, (_, hour) => {
			const hourProgress = hour / 24;
			const variation = Math.sin(hourProgress * Math.PI * 2) * 0.3;
			return Math.max(
				0.2,
				mockConditions.waveHeight +
					variation +
					(seededRandom(seed + hour * 0.1) - 0.5) * 0.2
			);
		}),
		period: Array.from({ length: 24 }, (_, hour) => {
			const hourProgress = hour / 24;
			const variation =
				Math.sin(hourProgress * Math.PI * 2 + Math.PI / 2) * 2;
			return Math.max(
				4,
				mockConditions.period +
					variation +
					(seededRandom(seed + hour * 0.15) - 0.5) * 1
			);
		}),
		windSpeed: Array.from({ length: 24 }, (_, hour) => {
			const hourProgress = hour / 24;
			const variation = Math.sin(hourProgress * Math.PI * 2) * 3;
			return Math.max(
				0,
				mockConditions.windSpeed +
					variation +
					(seededRandom(seed + hour * 0.2) - 0.5) * 2
			);
		}),
		windDirection: Array.from({ length: 24 }, (_, hour) => {
			const hourProgress = hour / 24;
			const variation =
				Math.sin(hourProgress * Math.PI * 2 + Math.PI / 4) * 30;
			return Math.max(
				0,
				Math.min(
					360,
					mockConditions.windDirection +
						variation +
						(seededRandom(seed + hour * 0.25) - 0.5) * 20
				)
			);
		}),
		swellDirection: Array.from({ length: 24 }, (_, hour) => {
			const hourProgress = hour / 24;
			const variation =
				Math.sin(hourProgress * Math.PI * 2 + Math.PI / 6) * 20;
			return Math.max(
				0,
				Math.min(
					360,
					mockConditions.swellDirection +
						variation +
						(seededRandom(seed + hour * 0.3) - 0.5) * 15
				)
			);
		}),
		times: Array.from({ length: 24 }, (_, hour) => {
			const hourDate = new Date();
			hourDate.setHours(hour, 0, 0, 0);
			return hourDate.toISOString();
		}),
	};

	// Calculate best time for today using the hourly data
	const bestTime = calculateBestTimeOfDay(hourlyData, spotData);

	return {
		...spot,
		...mockConditions,
		distance,
		surfScore: Math.round(surfScore * 10) / 10,
		rating,
		factors: factors.slice(0, 3), // Keep top 3 most relevant factors
		hourlyData, // Add hourly data to the spot
		bestTime, // Add best time analysis
		conditions: {
			waveHeight: mockConditions.waveHeight,
			swellWaveHeight: mockConditions.waveHeight * 0.8,
			swellWavePeriod: mockConditions.period,
			wavePeriod: mockConditions.period,
			windSpeed: mockConditions.windSpeed,
			windDirection: mockConditions.windDirection,
			swellWaveDirection: mockConditions.swellDirection,
			timestamp: new Date().toISOString(),
			tideData: mockConditions.tideData,
		},
		surfDescription: `🔄 Mock data: ${spot.reliability || "Variable"} conditions at ${spot.name}. Live weather data loading...`,
	};
};

/**
 * Generates 5-day mock forecast data
 */
export const generateMockForecast = (
	spotName: string,
	lat: string,
	lng: string,
	spotData?: any
) => {
	const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
	const mockSeed = parseFloat(lat) + parseFloat(lng);

	const forecast = days.map((day, index) => {
		const daySeed = mockSeed + index * 41;
		const mockConditions = generateMockSurfConditions(daySeed);

		const spotDataForScoring: SpotData = {
			optimalWindDir: spotData?.optimalWindDir,
			optimalSwellDir: spotData?.optimalSwellDir,
			bestTide: spotData?.bestTide,
		};

		const score = calculateSurfScore(mockConditions, spotDataForScoring);
		const rating = getScoreRating(score);
		const factors = generateSurfFactors(
			mockConditions,
			spotDataForScoring,
			score
		);

		const date = new Date();
		date.setDate(date.getDate() + index);

		// Generate hourly data for the day
		const hourlyData = {
			waveHeight: Array.from({ length: 24 }, (_, hour) => {
				const hourProgress = hour / 24;
				const variation = Math.sin(hourProgress * Math.PI * 2) * 0.3;
				return Math.max(
					0.2,
					mockConditions.waveHeight +
						variation +
						(Math.random() - 0.5) * 0.2
				);
			}),
			period: Array.from({ length: 24 }, (_, hour) => {
				const hourProgress = hour / 24;
				const variation =
					Math.sin(hourProgress * Math.PI * 2 + Math.PI / 2) * 2;
				return Math.max(
					4,
					mockConditions.period +
						variation +
						(Math.random() - 0.5) * 1
				);
			}),
			windSpeed: Array.from({ length: 24 }, (_, hour) => {
				const hourProgress = hour / 24;
				const variation = Math.sin(hourProgress * Math.PI * 2) * 3;
				return Math.max(
					0,
					mockConditions.windSpeed +
						variation +
						(Math.random() - 0.5) * 2
				);
			}),
			windDirection: Array.from({ length: 24 }, (_, hour) => {
				const hourProgress = hour / 24;
				const variation =
					Math.sin(hourProgress * Math.PI * 2 + Math.PI / 4) * 30;
				return Math.max(
					0,
					Math.min(
						360,
						mockConditions.windDirection +
							variation +
							(Math.random() - 0.5) * 20
					)
				);
			}),
			times: Array.from({ length: 24 }, (_, hour) => {
				const hourDate = new Date(date);
				hourDate.setHours(hour, 0, 0, 0);
				return hourDate.toISOString();
			}),
		};

		return {
			date: date.toISOString().split("T")[0],
			dayName: day,
			dateStr: date.toLocaleDateString("en-GB", {
				month: "short",
				day: "numeric",
			}),
			score: Math.round(score * 10) / 10,
			waveHeight: Math.round(mockConditions.waveHeight * 10) / 10,
			period: Math.round(mockConditions.period * 10) / 10,
			windSpeed: Math.round(mockConditions.windSpeed * 10) / 10,
			factors: factors,
			rating,
			tideData: mockConditions.tideData,
			hourlyData: hourlyData,
		};
	});

	return {
		spot: {
			name: spotName?.replace(/-/g, " ") || "Unknown Spot",
			latitude: parseFloat(lat || "0"),
			longitude: parseFloat(lng || "0"),
			skillLevel: spotData?.skillLevel || "Intermediate",
			breakType: spotData?.breakType || "beach",
			reliability: spotData?.reliability || "Consistent",
			...(spotData && {
				optimalSwellDir: spotData.optimalSwellDir,
				optimalWindDir: spotData.optimalWindDir,
				bestTide: spotData.bestTide,
				bestConditions: spotData.bestConditions,
			}),
		},
		forecast,
		timestamp: new Date().toISOString(),
	};
};

/**
 * Generates surf condition factors based on score and conditions
 */
const generateSurfFactors = (
	conditions: SurfConditions,
	spotData?: SpotData,
	score?: number
): string[] => {
	const factors = [
		"🔄 Mock data for development",
		score !== undefined
			? score > 7
				? "Excellent wave conditions"
				: score > 5
					? "Good surf potential"
					: score > 3
						? "Average conditions"
						: "Poor conditions"
			: "Conditions assessment",
		conditions.period > 10
			? "Clean groundswell"
			: conditions.period > 8
				? "Good wave period"
				: "Moderate period",
	];

	// Add wind factor
	if (spotData?.optimalWindDir?.length) {
		const windMatches = spotData.optimalWindDir.some((optimalDir) => {
			const diff = Math.abs(conditions.windDirection - optimalDir);
			const angleDiff = Math.min(diff, 360 - diff);
			return angleDiff <= 45;
		});
		factors.push(
			windMatches
				? "Favorable wind direction"
				: "Challenging wind direction"
		);
	} else {
		factors.push("Variable wind");
	}

	// Add swell factor
	if (spotData?.optimalSwellDir?.length) {
		const swellMatches = spotData.optimalSwellDir.some((optimalDir) => {
			const diff = Math.abs(conditions.swellDirection - optimalDir);
			const angleDiff = Math.min(diff, 360 - diff);
			return angleDiff <= 30;
		});
		factors.push(
			swellMatches ? "Optimal swell angle" : "Suboptimal swell angle"
		);
	} else {
		factors.push("Mixed swell conditions");
	}

	return factors.filter((factor) => factor.length > 0);
};

/**
 * Calculate best time of day based on hourly surf conditions
 */
const calculateBestTimeOfDay = (hourlyData: any, spotData: SpotData) => {
	const scores = [];

	for (let hour = 0; hour < 24; hour++) {
		let hourScore = 0;
		const factors = [];

		// Wave height factor (0-3 points)
		const waveHeight = hourlyData.waveHeight[hour] || 0;
		if (waveHeight >= 0.6 && waveHeight <= 2.5) {
			hourScore += 3;
			factors.push("Great wave size");
		} else if (waveHeight >= 0.3 && waveHeight < 0.6) {
			hourScore += 1;
			factors.push("Small but rideable");
		} else if (waveHeight > 2.5) {
			hourScore += 1.5;
			factors.push("Large waves");
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

		// Daylight bonus (0-1 points)
		if (hour >= 6 && hour <= 18) {
			hourScore += 1;
			factors.push("Daylight hours");
		} else {
			hourScore *= 0.3; // Significant penalty for dark hours
			factors.push("Dark hours");
		}

		scores.push({
			hour,
			score: Math.min(hourScore, 10.0),
			factors: factors.slice(0, 3),
			time: `${hour.toString().padStart(2, "0")}:00`,
		});
	}

	// Find the best time
	const sortedTimes = scores.sort((a, b) => b.score - a.score);
	const bestTime = sortedTimes[0];

	// Find best window (consecutive good hours)
	const goodHours = scores.filter(
		(s) => s.score >= 6.0 && !s.factors.includes("Dark hours")
	);
	let bestWindow = null;

	if (goodHours.length >= 2) {
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
};

/**
 * Calculate distance between two points using Haversine formula
 */
export const calculateDistance = (
	lat1: number,
	lng1: number,
	lat2: number,
	lng2: number
): number => {
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
};
