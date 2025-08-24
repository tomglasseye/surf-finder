import {
	calculateSurfScore,
	getScoreRating,
	type SurfConditions,
	type SpotData,
} from "./surfScore";
import { getAdmiraltyTideData, getSunriseSunsetData } from "./admiraltyApi";

export interface LiveTideData {
	currentLevel: number;
	isRising: boolean;
	nextHigh: Date;
	nextLow: Date;
	source: string;
	tideEvents: Array<{
		time: string;
		type: "high" | "low";
		height: number;
	}>;
}

export interface LiveSurfConditions extends SurfConditions {
	tideData: LiveTideData;
}

export interface LiveHourlyData {
	hour: number;
	time: string;
	waveHeight: number;
	period: number;
	windSpeed: number;
	windDirection: number;
	swellDirection: number;
	swellHeight: number;
	tideLevel: number;
	score?: number;
}

export interface LiveSpotData {
	name: string;
	latitude: number;
	longitude: number;
	region: string;
	distance: number;
	surfScore: number;
	waveHeight: number;
	windSpeed: number;
	conditions: LiveSurfConditions;
	hourlyData: LiveHourlyData[];
	bestTime?: any;
	tideData: LiveTideData;
	// Static spot preferences
	bestTide?: string;
	optimalWindDir?: number[];
	optimalSwellDir?: number[];
	skillLevel?: string;
	breakType?: string;
	reliability?: string;
	hazards?: string;
	description?: string;
	bestConditions?: string;
	surfDescription?: string;
}

/**
 * Get live marine conditions from Open-Meteo API
 */
async function getLiveMarineConditions(
	latitude: number,
	longitude: number,
	days: number = 1
): Promise<LiveHourlyData[]> {
	try {
		console.log(`🌊 Fetching live marine data for ${latitude}, ${longitude} - ${days} days`);
		
		// Try server-side function first
		const response = await fetch(
			`/.netlify/functions/get-marine-conditions?lat=${latitude}&lng=${longitude}&days=${days}`,
			{
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				},
			}
		);

		if (response.ok) {
			const data = await response.json();
			console.log(`🌊 Retrieved live marine data from Open-Meteo: ${data.hourlyData?.length || 0} hours`);
			
			if (data.hourlyData && Array.isArray(data.hourlyData) && data.hourlyData.length > 0) {
				return data.hourlyData.map((hour: any) => ({
					hour: hour.hour,
					time: new Date(hour.time).toLocaleTimeString("en-GB", { 
						hour: "2-digit", 
						minute: "2-digit" 
					}),
					waveHeight: hour.waveHeight,
					period: hour.period,
					windSpeed: hour.windSpeed,
					windDirection: hour.windDirection,
					swellDirection: hour.swellDirection,
					swellHeight: hour.swellHeight,
					tideLevel: 0.5, // Will be updated with tide data
				}));
			} else {
				throw new Error(`Invalid data structure: ${JSON.stringify(data)}`);
			}
		} else {
			const errorText = await response.text();
			console.error(`Marine API error: ${response.status} - ${errorText}`);
			throw new Error(`Marine API error: ${response.status} - ${errorText}`);
		}
	} catch (error) {
		console.error("Failed to fetch live marine data:", error);
		console.log("🌊 Falling back to mock data due to API failure");
		// Return mock data as fallback
		return generateMockHourlyData(latitude, longitude, days);
	}
}

/**
 * Integrate live tide data with marine conditions - enhanced for 7-day forecasting
 */
async function integrateTideData(
	hourlyData: LiveHourlyData[],
	latitude: number,
	longitude: number
): Promise<LiveHourlyData[]> {
	try {
		const startDate = new Date();
		startDate.setHours(0, 0, 0, 0); // Start of today
		const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
		
		console.log(`🌊 Fetching tide data for 7 days: ${startDate.toISOString()} to ${endDate.toISOString()}`);
		
		const tideResponse = await getAdmiraltyTideData(latitude, longitude, startDate, endDate);
		
		if (tideResponse.tideEvents.length > 0) {
			console.log(`🌊 Integrating ${tideResponse.tideEvents.length} tide events with marine data`);
			
			// Calculate tide levels for each hour across all 7 days
			return hourlyData.map((hour, index) => {
				// Calculate the actual timestamp for this hour
				const hourTimestamp = new Date(startDate.getTime() + index * 60 * 60 * 1000);
				const tideLevel = calculateTideLevelForTimestamp(hourTimestamp, tideResponse.tideEvents);
				return {
					...hour,
					tideLevel: tideLevel
				};
			});
		}
	} catch (error) {
		console.warn("Could not integrate tide data:", error);
	}
	
	return hourlyData;
}

/**
 * Calculate tide level for a specific timestamp
 */
function calculateTideLevelForTimestamp(targetTime: Date, tideEvents: any[]): number {
	
	// Find surrounding tide events
	const sortedEvents = tideEvents
		.map(event => ({
			...event,
			time: new Date(event.time)
		}))
		.sort((a, b) => a.time.getTime() - b.time.getTime());
	
	// Find the events before and after target time
	let beforeEvent = null;
	let afterEvent = null;
	
	for (let i = 0; i < sortedEvents.length - 1; i++) {
		if (sortedEvents[i].time <= targetTime && sortedEvents[i + 1].time > targetTime) {
			beforeEvent = sortedEvents[i];
			afterEvent = sortedEvents[i + 1];
			break;
		}
	}
	
	if (!beforeEvent || !afterEvent) {
		return 0.5; // Default mid-tide
	}
	
	// Calculate interpolated tide level (0-1 scale)
	const totalTime = afterEvent.time.getTime() - beforeEvent.time.getTime();
	const elapsedTime = targetTime.getTime() - beforeEvent.time.getTime();
	const progress = elapsedTime / totalTime;
	
	// Interpolate height
	const heightDiff = afterEvent.height - beforeEvent.height;
	const currentHeight = beforeEvent.height + (heightDiff * progress);
	
	// Convert to 0-1 scale (assuming 0-6m tide range)
	return Math.max(0, Math.min(1, currentHeight / 6));
}

/**
 * Create enriched spot data with live conditions
 */
export async function createLiveEnrichedSpot(
	spot: any,
	seed: number,
	userLocation: { latitude: number; longitude: number }
): Promise<LiveSpotData> {
	try {
		console.log(`🌊 Creating live enriched spot for ${spot.name}`);
		
		// Get live marine conditions
		const liveHourlyData = await getLiveMarineConditions(spot.latitude, spot.longitude, 1);
		
		// Integrate with tide data
		const hourlyDataWithTides = await integrateTideData(liveHourlyData, spot.latitude, spot.longitude);
		
		// Get current conditions (first hour or closest to current time)
		const now = new Date();
		const currentHour = now.getHours();
		const currentConditions = hourlyDataWithTides.find(h => h.hour === currentHour) || hourlyDataWithTides[0];
		
		if (!currentConditions) {
			throw new Error("No current conditions available");
		}
		
		// Calculate live surf score
		const conditions: SurfConditions = {
			waveHeight: currentConditions.waveHeight,
			period: currentConditions.period,
			windSpeed: currentConditions.windSpeed,
			windDirection: currentConditions.windDirection,
			swellDirection: currentConditions.swellDirection,
			tideLevel: currentConditions.tideLevel,
		};
		
		const spotData: SpotData = {
			bestTide: spot.bestTide,
			optimalWindDir: spot.optimalWindDir,
			optimalSwellDir: spot.optimalSwellDir,
		};
		
		const surfScore = calculateSurfScore(conditions, spotData);
		
		// Build live tide data
		const liveTideData: LiveTideData = {
			currentLevel: currentConditions.tideLevel,
			isRising: currentConditions.tideLevel > 0.5, // Simplified logic
			nextHigh: new Date(Date.now() + 6 * 60 * 60 * 1000), // Placeholder
			nextLow: new Date(Date.now() + 12 * 60 * 60 * 1000), // Placeholder
			source: "admiralty_uk",
			tideEvents: [],
		};
		
		// Calculate distance
		const distance = calculateDistance(
			userLocation.latitude,
			userLocation.longitude,
			spot.latitude,
			spot.longitude
		);
		
		const liveSurfConditions: LiveSurfConditions = {
			...conditions,
			tideData: liveTideData,
		};
		
		const enrichedSpot: LiveSpotData = {
			name: spot.name,
			latitude: spot.latitude,
			longitude: spot.longitude,
			region: spot.region || "UK",
			distance: distance,
			surfScore: surfScore,
			waveHeight: currentConditions.waveHeight,
			windSpeed: currentConditions.windSpeed,
			conditions: liveSurfConditions,
			hourlyData: hourlyDataWithTides,
			tideData: liveTideData,
			// Static spot data
			bestTide: spot.bestTide,
			optimalWindDir: spot.optimalWindDir,
			optimalSwellDir: spot.optimalSwellDir,
			skillLevel: spot.skillLevel,
			breakType: spot.breakType,
			reliability: spot.reliability,
			hazards: spot.hazards,
			description: spot.description,
			bestConditions: spot.bestConditions,
			surfDescription: `🌊 Live conditions: ${surfScore}/10 - ${currentConditions.waveHeight.toFixed(1)}m waves, ${currentConditions.windSpeed.toFixed(0)}km/h winds`,
		};
		
		console.log(`✅ Live spot created for ${spot.name}: ${surfScore}/10 score`);
		return enrichedSpot;
		
	} catch (error) {
		console.error(`Failed to create live spot for ${spot.name}:`, error);
		// Fallback to mock data (import and call existing mock function)
		const { createEnrichedSpot } = await import('./mockData');
		return createEnrichedSpot(spot, seed, userLocation) as any;
	}
}

/**
 * Calculate distance between two points
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const R = 6371; // Earth's radius in km
	const dLat = (lat2 - lat1) * Math.PI / 180;
	const dLon = (lon2 - lon1) * Math.PI / 180;
	const a = 
		Math.sin(dLat/2) * Math.sin(dLat/2) +
		Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
		Math.sin(dLon/2) * Math.sin(dLon/2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
	return R * c;
}

/**
 * Fallback mock hourly data generation
 */
function generateMockHourlyData(latitude: number, longitude: number, days: number): LiveHourlyData[] {
	const hourlyData: LiveHourlyData[] = [];
	
	for (let day = 0; day < days; day++) {
		for (let hour = 0; hour < 24; hour++) {
			const seed = latitude + longitude + day + hour;
			const time = new Date();
			time.setDate(time.getDate() + day);
			time.setHours(hour, 0, 0, 0);
			
			hourlyData.push({
				hour: hour,
				time: time.toLocaleTimeString("en-GB", { 
					hour: "2-digit", 
					minute: "2-digit" 
				}),
				waveHeight: 0.3 + (Math.sin(seed) * 0.5 + 0.5) * 2.2,
				period: 6 + (Math.sin(seed * 1.3) * 0.5 + 0.5) * 8,
				windSpeed: (Math.sin(seed * 1.7) * 0.5 + 0.5) * 25,
				windDirection: 90 + (Math.sin(seed * 2.1) * 0.5 + 0.5) * 180,
				swellDirection: 270 + (Math.sin(seed * 2.3) * 0.5 + 0.5) * 90,
				swellHeight: 0.2 + (Math.sin(seed * 2.5) * 0.5 + 0.5) * 1.5,
				tideLevel: Math.sin(seed * 2.7) * 0.5 + 0.5,
			});
		}
	}
	
	return hourlyData;
}

/**
 * Create live 7-day forecast for forecast page
 */
export async function createLiveForecast(
	spotData: any,
	lat: string,
	lng: string
): Promise<any> {
	try {
		const latitude = parseFloat(lat);
		const longitude = parseFloat(lng);
		
		console.log(`🌊 Creating 7-day live forecast for ${spotData.name}`);
		
		// Get 7 days of live marine data
		const liveForecastData = await getLiveMarineConditions(latitude, longitude, 7);
		
		// Integrate with tide data for all 7 days
		const forecastWithTides = await integrateTideData(liveForecastData, latitude, longitude);
		
		// Group by days
		const forecastDays = [];
		const dailyGroups = groupHourlyDataByDay(forecastWithTides);
		
		for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
			const dayData = dailyGroups[dayIndex] || [];
			const date = new Date();
			date.setDate(date.getDate() + dayIndex);
			
			// Calculate day's best conditions
			let bestScore = 0;
			let bestHour = 12; // Default to midday
			let bestFactors: string[] = [];
			
			const dayHourlyData = dayData.map((hour, index) => {
				const conditions = {
					waveHeight: hour.waveHeight,
					period: hour.period,
					windSpeed: hour.windSpeed,
					windDirection: hour.windDirection,
					swellDirection: hour.swellDirection,
					tideLevel: hour.tideLevel,
				};
				
				const spotPrefs = {
					bestTide: spotData.bestTide,
					optimalWindDir: spotData.optimalWindDir,
					optimalSwellDir: spotData.optimalSwellDir,
				};
				
				const score = calculateSurfScore(conditions, spotPrefs);
				
				if (score > bestScore) {
					bestScore = score;
					bestHour = hour.hour;
					
					// Calculate factors for best time
					bestFactors = [];
					if (conditions.waveHeight >= 0.8 && conditions.waveHeight <= 2.2) {
						bestFactors.push("Good wave size");
					}
					if (conditions.period >= 8) {
						bestFactors.push("Quality swell");
					}
					if (conditions.windSpeed <= 15) {
						bestFactors.push("Light winds");
					}
					if (spotPrefs.bestTide && 
						((spotPrefs.bestTide === "low" && conditions.tideLevel < 0.3) ||
						 (spotPrefs.bestTide === "mid" && conditions.tideLevel >= 0.3 && conditions.tideLevel <= 0.7) ||
						 (spotPrefs.bestTide === "high" && conditions.tideLevel > 0.7))) {
						bestFactors.push("Optimal tide");
					}
					if (spotPrefs.optimalWindDir && spotPrefs.optimalWindDir.some((dir: number) => {
						const diff = Math.abs(conditions.windDirection - dir);
						return Math.min(diff, 360 - diff) <= 45;
					})) {
						bestFactors.push("Favorable winds");
					}
					if (spotPrefs.optimalSwellDir && spotPrefs.optimalSwellDir.some((dir: number) => {
						const diff = Math.abs(conditions.swellDirection - dir);
						return Math.min(diff, 360 - diff) <= 30;
					})) {
						bestFactors.push("Good swell direction");
					}
				}
				
				return {
					...hour,
					score: score
				};
			});
			
			// Calculate average conditions for the day
			const avgWaveHeight = dayHourlyData.reduce((sum, h) => sum + h.waveHeight, 0) / dayHourlyData.length;
			const avgWindSpeed = dayHourlyData.reduce((sum, h) => sum + h.windSpeed, 0) / dayHourlyData.length;
			
			const transformedHourlyData = transformHourlyDataForCharts(dayHourlyData, dayIndex);
			console.log(`📊 Day ${dayIndex} hourly data:`, {
				originalLength: dayHourlyData.length,
				transformedData: transformedHourlyData ? 'object' : 'null',
				hasWaveHeight: transformedHourlyData?.waveHeight?.length || 0
			});

			forecastDays.push({
				date: date.toISOString(),
				dayName: date.toLocaleDateString("en-GB", { weekday: "long" }),
				dateStr: date.toLocaleDateString("en-GB", { 
					month: "short", 
					day: "numeric" 
				}),
				score: Math.round(bestScore * 10) / 10,
				waveHeight: Math.round(avgWaveHeight * 10) / 10,
				windSpeed: Math.round(avgWindSpeed * 1) / 10,
				period: dayHourlyData.length > 0 ? dayHourlyData[0].period : 8,
				hourlyData: transformedHourlyData,
				bestTime: {
					hour: bestHour,
					score: bestScore,
					time: `${bestHour.toString().padStart(2, '0')}:00`,
					factors: bestFactors.length > 0 ? bestFactors : ["Decent conditions"]
				}
			});
		}
		
		const liveForecast = {
			spot: {
				name: spotData.name,
				latitude: latitude,
				longitude: longitude,
				region: spotData.region || "UK",
				bestTide: spotData.bestTide,
				optimalWindDir: spotData.optimalWindDir,
				optimalSwellDir: spotData.optimalSwellDir,
				skillLevel: spotData.skillLevel,
				breakType: spotData.breakType,
				reliability: spotData.reliability,
				hazards: spotData.hazards,
				description: spotData.description,
				bestConditions: spotData.bestConditions,
			},
			forecast: forecastDays, // Changed from 'days' to 'forecast' to match expected format
			source: "live_apis"
		};
		
		console.log(`✅ Live 7-day forecast created for ${spotData.name}: ${forecastDays.length} days`);
		return liveForecast;
		
	} catch (error) {
		console.error(`Failed to create live forecast:`, error);
		throw error;
	}
}

/**
 * Transform live hourly data array to chart-compatible format
 */
function transformHourlyDataForCharts(hourlyDataArray: LiveHourlyData[], dayOffset: number = 0): any {
	console.log('🔄 transformHourlyDataForCharts called:', {
		hasArray: !!hourlyDataArray,
		arrayLength: hourlyDataArray?.length,
		dayOffset
	});

	if (!hourlyDataArray || hourlyDataArray.length === 0) {
		console.log('❌ transformHourlyDataForCharts: No hourly data provided, returning null');
		return null;
	}

	const waveHeight: number[] = [];
	const period: number[] = [];
	const windSpeed: number[] = [];
	const windDirection: number[] = [];
	const swellDirection: number[] = [];
	const times: string[] = [];

	hourlyDataArray.forEach((hour, index) => {
		waveHeight.push(hour.waveHeight || 0);
		period.push(hour.period || 8);
		windSpeed.push(hour.windSpeed || 0);
		windDirection.push(hour.windDirection || 0);
		swellDirection.push(hour.swellDirection || 0);
		
		// Create proper timestamp for this hour on the correct day
		const now = new Date();
		const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const targetDay = new Date(startOfDay.getTime() + dayOffset * 24 * 60 * 60 * 1000);
		const hourTimestamp = new Date(targetDay.getTime() + index * 60 * 60 * 1000);
		times.push(hourTimestamp.toISOString());
	});

	const result = {
		waveHeight,
		period,
		windSpeed,
		windDirection,
		swellDirection,
		times
	};

	console.log('✅ transformHourlyDataForCharts result:', {
		waveHeightLength: result.waveHeight.length,
		timesLength: result.times.length,
		sampleWaveHeight: result.waveHeight.slice(0, 3),
		sampleTimes: result.times.slice(0, 3)
	});

	return result;
}

/**
 * Group hourly data by day - improved for accurate 7-day forecasting
 */
function groupHourlyDataByDay(hourlyData: LiveHourlyData[]): LiveHourlyData[][] {
	const grouped: { [key: string]: LiveHourlyData[] } = {};
	const today = new Date();
	today.setHours(0, 0, 0, 0); // Start of today
	
	hourlyData.forEach((hour, index) => {
		// Calculate which day this hour represents (0-6 for 7 days)
		const hoursSinceStart = index;
		const dayOffset = Math.floor(hoursSinceStart / 24);
		const hourInDay = hoursSinceStart % 24;
		
		// Limit to 7 days
		if (dayOffset < 7) {
			const dayKey = `day-${dayOffset}`;
			
			if (!grouped[dayKey]) {
				grouped[dayKey] = [];
			}
			
			// Create proper date for this hour
			const hourDate = new Date(today.getTime() + dayOffset * 24 * 60 * 60 * 1000);
			hourDate.setHours(hourInDay);
			
			grouped[dayKey].push({
				...hour,
				hour: hourInDay, // 0-23 for the day
				time: hourDate.toLocaleTimeString("en-GB", { 
					hour: "2-digit", 
					minute: "2-digit" 
				})
			});
		}
	});
	
	// Convert to array of arrays for exactly 7 days
	const result = [];
	for (let i = 0; i < 7; i++) {
		const dayData = grouped[`day-${i}`] || [];
		// Ensure each day has 24 hours or fill gaps
		if (dayData.length < 24) {
			console.log(`⚠️ Day ${i} has only ${dayData.length} hours, filling gaps`);
			// Fill missing hours with interpolated data if needed
			while (dayData.length < 24) {
				const lastHour = dayData[dayData.length - 1];
				if (lastHour) {
					dayData.push({
						...lastHour,
						hour: dayData.length,
						time: `${dayData.length.toString().padStart(2, '0')}:00`
					});
				}
			}
		}
		result.push(dayData.slice(0, 24)); // Ensure exactly 24 hours per day
	}
	
	console.log(`📅 Grouped data into ${result.length} days:`, result.map((day, i) => `Day ${i}: ${day.length} hours`));
	return result;
}