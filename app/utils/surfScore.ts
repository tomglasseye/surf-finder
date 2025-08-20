export interface SurfConditions {
	waveHeight: number;
	period: number;
	windSpeed: number;
	windDirection: number;
	swellDirection: number;
	tideLevel: number; // 0-1 scale
}

export interface SpotData {
	optimalWindDir?: number[];
	optimalSwellDir?: number[];
	bestTide?: string;
}

export interface SurfScoreFactors {
	heightScore: number;
	periodScore: number;
	windScore: number;
	swellScore: number;
	tideScore: number;
	windSpeedScore: number;
}

/**
 * Calculates the surf forecast score using standardized conditions and spot preferences.
 *
 * The score is based on the following attributes:
 * - Wave height (optimal: 1–1.8m, max 3 points)
 * - Wave period (optimal: 10–14s, max 2 points)
 * - Wind direction (matches spot's optimal wind directions, max 1.5 points)
 * - Swell direction (matches spot's optimal swell directions, max 1.5 points)
 * - Tide level (matches spot's best tide, max 1 point)
 * - Wind speed (lower is better, max 1 point)
 *
 * There is no base score; only near-perfect conditions can reach a score close to 10.
 *
 * @param conditions - The surf conditions
 * @param spotData - The spot's preferences and optimal conditions
 * @returns The calculated score, clamped between 1.0 and 10.0
 */
export const calculateSurfScore = (
	conditions: SurfConditions,
	spotData?: SpotData
): number => {
	const factors = calculateSurfScoreFactors(conditions, spotData);
	
	const totalScore = 
		factors.heightScore +
		factors.periodScore +
		factors.windScore +
		factors.swellScore +
		factors.tideScore +
		factors.windSpeedScore;
		
	return Math.min(Math.max(totalScore, 1.0), 10.0);
};

/**
 * Calculates individual scoring factors for surf conditions
 */
export const calculateSurfScoreFactors = (
	conditions: SurfConditions,
	spotData?: SpotData
): SurfScoreFactors => {
	const { waveHeight, period, windSpeed, windDirection, swellDirection, tideLevel } = conditions;

	// Wave height (max 3)
	let heightScore = 0;
	if (waveHeight >= 1 && waveHeight <= 1.8) heightScore = 3;
	else if (waveHeight >= 0.8 && waveHeight < 1) heightScore = 2;
	else if (waveHeight > 1.8 && waveHeight <= 2.2) heightScore = 2;
	else if (waveHeight > 0.5 && waveHeight < 0.8) heightScore = 1;
	else heightScore = 0;

	// Period (max 2)
	let periodScore = 0;
	if (period >= 10 && period <= 14) periodScore = 2;
	else if (period >= 8 && period < 10) periodScore = 1;
	else periodScore = 0;

	// Wind direction (max 1.5)
	let windScore = 0;
	if (spotData?.optimalWindDir?.length) {
		const windMatches = spotData.optimalWindDir.some((optimalDir) => {
			const diff = Math.abs(windDirection - optimalDir);
			const angleDiff = Math.min(diff, 360 - diff);
			return angleDiff <= 45;
		});
		windScore = windMatches ? 1.5 : 0;
	}

	// Swell direction (max 1.5)
	let swellScore = 0;
	if (spotData?.optimalSwellDir?.length) {
		const swellMatches = spotData.optimalSwellDir.some((optimalDir) => {
			const diff = Math.abs(swellDirection - optimalDir);
			const angleDiff = Math.min(diff, 360 - diff);
			return angleDiff <= 30;
		});
		swellScore = swellMatches ? 1.5 : 0;
	}

	// Tide (max 1)
	let tideScore = 0;
	if (spotData?.bestTide) {
		const currentTidePercent = tideLevel * 100;
		switch (spotData.bestTide.toLowerCase()) {
			case "low":
				tideScore = currentTidePercent < 30 ? 1 : 0;
				break;
			case "mid":
				tideScore = currentTidePercent >= 30 && currentTidePercent <= 70 ? 1 : 0;
				break;
			case "high":
				tideScore = currentTidePercent > 70 ? 1 : 0;
				break;
			default:
				tideScore = 0.2;
		}
	}

	// Wind speed (max 1)
	let windSpeedScore = 0;
	if (windSpeed < 5) windSpeedScore = 1;
	else if (windSpeed < 15) windSpeedScore = 0.5;
	else windSpeedScore = 0;

	return {
		heightScore,
		periodScore,
		windScore,
		swellScore,
		tideScore,
		windSpeedScore
	};
};

/**
 * Gets the CSS color class for a surf score (minimal black/white scheme)
 */
export const getScoreColor = (score: number): string => {
	if (score >= 7) return "text-black font-bold";
	if (score >= 5.5) return "text-gray-800 font-semibold";
	if (score >= 4) return "text-gray-600";
	if (score >= 2) return "text-gray-500";
	return "text-gray-400";
};

/**
 * Gets the emoji representation for a surf score
 */
export const getScoreEmoji = (score: number): string => {
	if (score >= 7) return "🔥";
	if (score >= 5.5) return "🌊";
	if (score >= 4) return "👍";
	if (score >= 2) return "⚠️";
	return "💤";
};

/**
 * Gets the rating text for a surf score
 */
export const getScoreRating = (score: number): string => {
	if (score >= 7) return "Excellent";
	if (score >= 5.5) return "Good";
	if (score >= 4) return "Average";
	if (score >= 2) return "Poor";
	return "Very Poor";
};

/**
 * Gets the CSS color class for a rating badge (minimal black/white scheme)
 */
export const getRatingColor = (rating: string): string => {
	switch (rating) {
		case "Excellent":
			return "bg-black text-white border-black";
		case "Good":
			return "bg-gray-800 text-white border-gray-800";
		case "Average":
			return "bg-gray-600 text-white border-gray-600";
		case "Poor":
			return "bg-gray-400 text-white border-gray-400";
		case "Very Poor":
			return "bg-gray-300 text-gray-800 border-gray-300";
		default:
			return "bg-white text-gray-800 border-gray-300";
	}
};