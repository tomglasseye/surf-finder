interface OpenMeteoMarineResponse {
	latitude: number;
	longitude: number;
	generationtime_ms: number;
	utc_offset_seconds: number;
	timezone: string;
	timezone_abbreviation: string;
	elevation: number;
	hourly_units: {
		time: string;
		wave_height: string;
		wave_direction: string;
		wave_period: string;
		wind_wave_height: string;
		wind_wave_direction: string;
		wind_wave_period: string;
		swell_wave_height: string;
		swell_wave_direction: string;
		swell_wave_period: string;
	};
	hourly: {
		time: string[];
		wave_height: number[];
		wave_direction: number[];
		wave_period: number[];
		wind_wave_height: number[];
		wind_wave_direction: number[];
		wind_wave_period: number[];
		swell_wave_height: number[];
		swell_wave_direction: number[];
		swell_wave_period: number[];
	};
}

interface OpenMeteoWeatherResponse {
	latitude: number;
	longitude: number;
	generationtime_ms: number;
	utc_offset_seconds: number;
	timezone: string;
	timezone_abbreviation: string;
	elevation: number;
	hourly_units: {
		time: string;
		wind_speed_10m: string;
		wind_direction_10m: string;
		wind_gusts_10m: string;
	};
	hourly: {
		time: string[];
		wind_speed_10m: number[];
		wind_direction_10m: number[];
		wind_gusts_10m: number[];
	};
}

export interface LiveMarineConditions {
	waveHeight: number;
	period: number;
	windSpeed: number;
	windDirection: number;
	swellDirection: number;
	swellHeight: number;
	timestamp: string;
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
	tideLevel: number; // Will be integrated with tide data
}

export async function getLiveMarineConditions(
	latitude: number,
	longitude: number,
	days: number = 1
): Promise<LiveHourlyData[]> {
	try {
		console.log(`🌊 Fetching live marine data for ${latitude}, ${longitude} - ${days} days`);
		
		// Fetch marine data (waves, swell)
		const marineResponse = await fetch(
			`https://marine-api.open-meteo.com/v1/marine?` +
			`latitude=${latitude}&longitude=${longitude}&` +
			`hourly=wave_height,wave_direction,wave_period,wind_wave_height,wind_wave_direction,wind_wave_period,swell_wave_height,swell_wave_direction,swell_wave_period&` +
			`forecast_days=${days}&timezone=auto`
		);

		if (!marineResponse.ok) {
			throw new Error(`Marine API error: ${marineResponse.status}`);
		}

		const marineData: OpenMeteoMarineResponse = await marineResponse.json();

		// Fetch weather data (wind)
		const weatherResponse = await fetch(
			`https://api.open-meteo.com/v1/forecast?` +
			`latitude=${latitude}&longitude=${longitude}&` +
			`hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m&` +
			`forecast_days=${days}&timezone=auto`
		);

		if (!weatherResponse.ok) {
			throw new Error(`Weather API error: ${weatherResponse.status}`);
		}

		const weatherData: OpenMeteoWeatherResponse = await weatherResponse.json();

		// Combine and process the data
		const hourlyData: LiveHourlyData[] = [];

		// Process each hour
		for (let i = 0; i < marineData.hourly.time.length && i < weatherData.hourly.time.length; i++) {
			const timeStr = marineData.hourly.time[i];
			const date = new Date(timeStr);
			const hour = date.getHours();

			// Use combined wave height (total waves = wind waves + swell)
			const windWaveHeight = marineData.hourly.wind_wave_height[i] || 0;
			const swellWaveHeight = marineData.hourly.swell_wave_height[i] || 0;
			const totalWaveHeight = Math.max(windWaveHeight, marineData.hourly.wave_height[i] || 0);

			// Use swell period if available, otherwise wind wave period
			const swellPeriod = marineData.hourly.swell_wave_period[i];
			const windPeriod = marineData.hourly.wind_wave_period[i];
			const period = swellPeriod && swellPeriod > 0 ? swellPeriod : (windPeriod || marineData.hourly.wave_period[i] || 8);

			// Convert wind speed from m/s to km/h
			const windSpeedMs = weatherData.hourly.wind_speed_10m[i] || 0;
			const windSpeedKmh = windSpeedMs * 3.6;

			// Use swell direction if available, otherwise wind wave direction
			const swellDirection = marineData.hourly.swell_wave_direction[i] || marineData.hourly.wind_wave_direction[i] || marineData.hourly.wave_direction[i] || 270;

			hourlyData.push({
				hour: hour,
				time: date.toLocaleTimeString("en-GB", { 
					hour: "2-digit", 
					minute: "2-digit" 
				}),
				waveHeight: totalWaveHeight,
				period: period,
				windSpeed: windSpeedKmh,
				windDirection: weatherData.hourly.wind_direction_10m[i] || 225,
				swellDirection: swellDirection,
				swellHeight: swellWaveHeight,
				tideLevel: 0.5, // Default, will be updated when integrated with tide data
			});
		}

		console.log(`🌊 Retrieved ${hourlyData.length} hours of live marine data from Open-Meteo`);
		console.log(`📊 Sample data point:`, hourlyData[0]);

		return hourlyData;

	} catch (error) {
		console.error("Open-Meteo API error:", error);
		throw error;
	}
}

export async function getCurrentMarineConditions(
	latitude: number,
	longitude: number
): Promise<LiveMarineConditions> {
	try {
		const hourlyData = await getLiveMarineConditions(latitude, longitude, 1);
		
		if (hourlyData.length === 0) {
			throw new Error("No marine data available");
		}

		// Find current hour or closest hour
		const now = new Date();
		const currentHour = now.getHours();
		
		const currentConditions = hourlyData.find(data => data.hour === currentHour) || hourlyData[0];

		return {
			waveHeight: currentConditions.waveHeight,
			period: currentConditions.period,
			windSpeed: currentConditions.windSpeed,
			windDirection: currentConditions.windDirection,
			swellDirection: currentConditions.swellDirection,
			swellHeight: currentConditions.swellHeight,
			timestamp: new Date().toISOString(),
		};

	} catch (error) {
		console.error("Error getting current marine conditions:", error);
		throw error;
	}
}