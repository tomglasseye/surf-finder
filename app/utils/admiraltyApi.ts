interface TideEvent {
	time: string;
	type: "high" | "low";
	height: number;
}

interface AdmiraltyTideResponse {
	tideEvents: TideEvent[];
	source: string;
}

interface SunriseSunsetResponse {
	results: {
		sunrise: string;
		sunset: string;
		solar_noon: string;
		day_length: string;
		civil_twilight_begin: string;
		civil_twilight_end: string;
		nautical_twilight_begin: string;
		nautical_twilight_end: string;
		astronomical_twilight_begin: string;
		astronomical_twilight_end: string;
	};
	status: string;
}

export async function getAdmiraltyTideData(
	latitude: number,
	longitude: number,
	startDate: Date,
	endDate?: Date
): Promise<AdmiraltyTideResponse> {
	try {
		// Try to fetch from your own API endpoint first
		// This should be implemented as a server-side function to avoid CORS issues
		const response = await fetch(
			`/.netlify/functions/get-tide-data?lat=${latitude}&lng=${longitude}&start=${startDate.toISOString()}&end=${endDate?.toISOString() || startDate.toISOString()}`
		);

		if (response.ok) {
			const data = await response.json();
			return {
				tideEvents: data.tideEvents,
				source: "admiralty_uk",
			};
		}
	} catch (error) {
		console.log("Server-side API not available, using mock data");
	}

	// Always fallback to realistic mock data for development
	console.log(`🌊 Using enhanced mock tide data for ${latitude}, ${longitude} from ${startDate.toISOString()} to ${endDate?.toISOString()}`);
	return generateMockTideData(latitude, longitude, startDate, endDate);
}

export async function getSunriseSunsetData(
	latitude: number,
	longitude: number,
	date: Date
): Promise<{ sunrise: Date; sunset: Date }> {
	try {
		const formattedDate = date.toISOString().split('T')[0];
		
		const response = await fetch(
			`https://api.sunrise-sunset.org/json?lat=${latitude}&lng=${longitude}&date=${formattedDate}&formatted=0`
		);
		
		if (!response.ok) {
			throw new Error(`Sunrise/sunset API error: ${response.status}`);
		}
		
		const data: SunriseSunsetResponse = await response.json();
		
		if (data.status !== "OK") {
			throw new Error("Sunrise/sunset API returned error status");
		}
		
		const sunrise = new Date(data.results.sunrise);
		const sunset = new Date(data.results.sunset);
		console.log(`🌅 Sunrise/sunset API success for ${formattedDate}: ${sunrise.toLocaleTimeString()} / ${sunset.toLocaleTimeString()}`);
		console.log(`🌅 Raw API data:`, data.results);
		
		return { sunrise, sunset };
	} catch (error) {
		console.error("Sunrise/sunset API error:", error);
		
		// Fallback calculation
		return calculateSunriseSunset(latitude, longitude, date);
	}
}

function generateMockTideData(
	latitude: number,
	longitude: number,
	startDate: Date,
	endDate?: Date
): AdmiraltyTideResponse {
	const events: TideEvent[] = [];
	const end = endDate || new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
	
	// Generate events starting 12 hours before and ending 12 hours after for smooth curves
	const extendedStart = new Date(startDate.getTime() - 12 * 60 * 60 * 1000);
	const extendedEnd = new Date(end.getTime() + 12 * 60 * 60 * 1000);
	
	// Create seed based on location for consistent data
	const seed = Math.floor((latitude + longitude) * 1000);
	let random = seed;
	const pseudoRandom = () => {
		random = (random * 9301 + 49297) % 233280;
		return random / 233280;
	};
	
	// UK tide characteristics
	let baseHeight = 3.2; // Average UK tide height
	let heightRange = 2.8; // UK tidal range (0.4m to 6.0m)
	
	// Adjust for location - higher tides in Bristol Channel, Severn Estuary
	if (latitude > 51.2 && latitude < 51.8 && longitude > -3.5 && longitude < -2.5) {
		baseHeight = 6.0; // Severn Estuary
		heightRange = 8.0;
	} else if (latitude > 50.0 && latitude < 51.5 && longitude > -5.5 && longitude < -3.0) {
		baseHeight = 4.5; // Southwest England
		heightRange = 3.5;
	}
	
	// Start with realistic time from extended start for smooth curves
	let currentTime = new Date(extendedStart);
	currentTime.setHours(Math.floor(pseudoRandom() * 6) + 1, Math.floor(pseudoRandom() * 60), 0, 0);
	
	// Determine if we start with high or low based on location
	let isHigh = pseudoRandom() > 0.5;
	
	// Generate realistic tidal cycle (12 hours 25 minutes average between same tides)
	while (currentTime < extendedEnd) {
		// Add lunar and solar influence
		const dayOfMonth = currentTime.getDate();
		const springNeapFactor = Math.cos(((dayOfMonth - 1) / 29.5) * 2 * Math.PI); // Spring/neap tide cycle
		const heightModifier = 1 + (springNeapFactor * 0.3); // ±30% variation
		
		// Daily variation
		const timeOfDay = currentTime.getHours() + currentTime.getMinutes() / 60;
		const dailyVariation = Math.sin(timeOfDay / 24 * Math.PI * 2) * 0.1;
		
		const height = isHigh 
			? (baseHeight + heightRange * heightModifier + dailyVariation)
			: (baseHeight - heightRange * heightModifier + dailyVariation * 0.5);
		
		events.push({
			time: currentTime.toISOString(),
			type: isHigh ? "high" : "low",
			height: Math.max(0.2, Math.min(height, baseHeight + heightRange * 1.5)), // Realistic bounds
		});
		
		// Realistic tidal intervals (6h 12m average, with variation)
		const baseInterval = 6.2 * 60 * 60 * 1000; // 6h 12m in milliseconds
		const variation = (pseudoRandom() - 0.5) * 30 * 60 * 1000; // ±30 minute variation
		currentTime = new Date(currentTime.getTime() + baseInterval + variation);
		isHigh = !isHigh;
	}
	
	// Sort by time to ensure proper order
	events.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
	
	console.log(`🌊 Generated ${events.length} mock tide events for ${latitude}, ${longitude}`);
	
	return {
		tideEvents: events,
		source: "enhanced_mock_uk",
	};
}

function calculateSunriseSunset(
	latitude: number,
	longitude: number,
	date: Date
): { sunrise: Date; sunset: Date } {
	const dayOfYear = Math.floor(
		(date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
	);
	
	const p = Math.asin(
		0.39795 * Math.cos((0.98563 * (dayOfYear - 173) * Math.PI) / 180)
	);
	
	const argument = -Math.tan((latitude * Math.PI) / 180) * Math.tan(p);
	const hourAngle = Math.acos(Math.max(-1, Math.min(1, argument)));
	
	const sunriseHour = 12 - (4 * (longitude + (hourAngle * 180) / Math.PI)) / 60;
	const sunsetHour = 12 - (4 * (longitude - (hourAngle * 180) / Math.PI)) / 60;
	
	const sunrise = new Date(date);
	sunrise.setHours(Math.floor(sunriseHour), (sunriseHour % 1) * 60, 0, 0);
	
	const sunset = new Date(date);
	sunset.setHours(Math.floor(sunsetHour), (sunsetHour % 1) * 60, 0, 0);
	
	console.log(`🌅 Fallback calculation for ${date.toISOString()}: ${sunrise.toLocaleTimeString()} / ${sunset.toLocaleTimeString()}`);
	
	return { sunrise, sunset };
}