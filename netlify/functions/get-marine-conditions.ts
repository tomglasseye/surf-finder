import type { Context } from "@netlify/functions";

interface OpenMeteoMarineResponse {
	latitude: number;
	longitude: number;
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
	hourly: {
		time: string[];
		wind_speed_10m: number[];
		wind_direction_10m: number[];
		wind_gusts_10m: number[];
	};
}

export default async (request: Request, context: Context) => {
	try {
		const url = new URL(request.url);
		const lat = url.searchParams.get('lat');
		const lng = url.searchParams.get('lng');
		const days = url.searchParams.get('days') || '1';

		if (!lat || !lng) {
			return new Response(
				JSON.stringify({ error: 'Missing required parameters: lat, lng' }),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			);
		}

		console.log(`🌊 Fetching marine conditions for ${lat}, ${lng} - ${days} days`);

		// Fetch marine data (waves, swell) from Open-Meteo
		const marineResponse = await fetch(
			`https://marine-api.open-meteo.com/v1/marine?` +
			`latitude=${lat}&longitude=${lng}&` +
			`hourly=wave_height,wave_direction,wave_period,wind_wave_height,wind_wave_direction,wind_wave_period,swell_wave_height,swell_wave_direction,swell_wave_period&` +
			`forecast_days=${days}&timezone=auto`
		);

		if (!marineResponse.ok) {
			throw new Error(`Marine API error: ${marineResponse.status}`);
		}

		const marineData: OpenMeteoMarineResponse = await marineResponse.json();

		// Fetch weather data (wind) from Open-Meteo
		const weatherResponse = await fetch(
			`https://api.open-meteo.com/v1/forecast?` +
			`latitude=${lat}&longitude=${lng}&` +
			`hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m&` +
			`forecast_days=${days}&timezone=auto`
		);

		if (!weatherResponse.ok) {
			throw new Error(`Weather API error: ${weatherResponse.status}`);
		}

		const weatherData: OpenMeteoWeatherResponse = await weatherResponse.json();

		// Process and combine the data
		const hourlyData = [];

		for (let i = 0; i < marineData.hourly.time.length && i < weatherData.hourly.time.length; i++) {
			const timeStr = marineData.hourly.time[i];
			const date = new Date(timeStr);
			
			// Calculate total wave height (wind waves + swell)
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
			const swellDirection = marineData.hourly.swell_wave_direction[i] || 
							  marineData.hourly.wind_wave_direction[i] || 
							  marineData.hourly.wave_direction[i] || 270;

			hourlyData.push({
				time: timeStr,
				hour: date.getHours(),
				waveHeight: Number(totalWaveHeight.toFixed(2)),
				period: Number(period.toFixed(1)),
				windSpeed: Number(windSpeedKmh.toFixed(1)),
				windDirection: Math.round(weatherData.hourly.wind_direction_10m[i] || 225),
				swellDirection: Math.round(swellDirection),
				swellHeight: Number(swellWaveHeight.toFixed(2)),
				windWaveHeight: Number(windWaveHeight.toFixed(2)),
			});
		}

		const response = {
			latitude: parseFloat(lat),
			longitude: parseFloat(lng),
			hourlyData,
			source: "open_meteo",
			generatedAt: new Date().toISOString(),
		};

		console.log(`🌊 Processed ${hourlyData.length} hours of marine data`);
		console.log(`📊 Sample conditions:`, hourlyData[0]);

		return new Response(JSON.stringify(response), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=1800', // Cache for 30 minutes
			}
		});

	} catch (error) {
		console.error('Marine conditions API error:', error);
		
		return new Response(
			JSON.stringify({ 
				error: 'Failed to fetch marine conditions',
				details: error instanceof Error ? error.message : String(error)
			}),
			{ 
				status: 500, 
				headers: { 'Content-Type': 'application/json' } 
			}
		);
	}
};