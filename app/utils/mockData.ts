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

	return {
		...spot,
		...mockConditions,
		distance,
		surfScore: Math.round(surfScore * 10) / 10,
		rating,
		factors: factors.slice(0, 3), // Keep top 3 most relevant factors
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
