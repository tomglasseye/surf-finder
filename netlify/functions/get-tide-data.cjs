// JavaScript version of the get-tide-data function

exports.handler = async (event, context) => {
	try {
		const { lat, lng, start, end } = event.queryStringParameters || {};

		if (!lat || !lng || !start) {
			return {
				statusCode: 400,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ error: 'Missing required parameters: lat, lng, start' })
			};
		}

		const ADMIRALTY_API_KEY = process.env.ADMIRALTY_API_KEY;
		if (!ADMIRALTY_API_KEY) {
			throw new Error('ADMIRALTY_API_KEY not configured');
		}

		console.log(`🌊 Getting tide data for ${lat}, ${lng} from ${start} to ${end || 'same day'}`);

		// Step 1: Find nearest tide station
		const stationResponse = await fetch(
			`https://admiraltyapi.azure-api.net/uktidalapi/api/V1/Stations?name=&latitude=${lat}&longitude=${lng}&radius=50`,
			{
				headers: {
					'Ocp-Apim-Subscription-Key': ADMIRALTY_API_KEY,
					'Content-Type': 'application/json'
				}
			}
		);

		if (!stationResponse.ok) {
			console.warn(`Station API returned ${stationResponse.status}, falling back to calculated tides`);
			return generateCalculatedTides(lat, lng, start, end);
		}

		const stationData = await stationResponse.json();
		
		if (!stationData.Features || stationData.Features.length === 0) {
			console.warn('No tide stations found via Admiralty API, falling back to calculated tides');
			return generateCalculatedTides(lat, lng, start, end);
		}

		const nearestStation = stationData.Features[0];
		console.log(`🌊 Using tide station: ${nearestStation.Name} (${nearestStation.Id})`);

		// Step 2: Get tide data for the station
		const startDate = new Date(start);
		const endDate = end ? new Date(end) : new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
		
		const tideResponse = await fetch(
			`https://admiraltyapi.azure-api.net/uktidalapi/api/V1/Stations/${nearestStation.Id}/TidalEvents?StartDateTime=${startDate.toISOString()}&EndDateTime=${endDate.toISOString()}`,
			{
				headers: {
					'Ocp-Apim-Subscription-Key': ADMIRALTY_API_KEY,
					'Content-Type': 'application/json'
				}
			}
		);

		if (!tideResponse.ok) {
			console.warn(`Tide API returned ${tideResponse.status}, falling back to calculated tides`);
			return generateCalculatedTides(lat, lng, start, end);
		}

		const tideData = await tideResponse.json();

		// Transform Admiralty format to our format
		const tideEvents = tideData.map(event => ({
			time: event.DateTime,
			type: event.EventType.toLowerCase(),
			height: event.Height
		}));

		const response = {
			tideEvents,
			source: "admiralty_uk"
		};

		console.log(`🌊 Retrieved ${tideEvents.length} tide events for ${nearestStation.Name}`);

		return {
			statusCode: 200,
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=1800' // Cache for 30 minutes
			},
			body: JSON.stringify(response)
		};

	} catch (error) {
		console.error('Admiralty API error:', error);
		console.log('Falling back to calculated tide data...');
		
		// Extract params for fallback
		const { lat, lng, start, end } = event.queryStringParameters || {};
		
		// Fall back to calculated tide data
		return generateCalculatedTides(lat, lng, start, end);
	}
};

/**
 * Generate calculated tide data when Admiralty API is unavailable
 */
function generateCalculatedTides(lat, lng, start, end) {
	try {
		const latitude = parseFloat(lat);
		const longitude = parseFloat(lng);
		const startDate = new Date(start);
		const endDate = end ? new Date(end) : new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
		
		console.log(`🧮 Generating calculated tides for ${latitude}, ${longitude} from ${startDate.toISOString()} to ${endDate.toISOString()}`);
		
		const tideEvents = [];
		const currentTime = startDate.getTime();
		const endTime = endDate.getTime();
		
		// Tidal periods (in hours)
		const M2_PERIOD = 12.420601; // Main lunar semi-diurnal
		const S2_PERIOD = 12.0; // Solar semi-diurnal
		
		// UK location-specific adjustments
		let phaseShift = 0;
		let amplitudeAdjustment = 1.0;
		
		// Regional adjustments based on UK coastal areas
		if (latitude >= 50 && latitude <= 51 && longitude >= -6 && longitude <= -4) {
			// Cornwall - Atlantic influence
			phaseShift = -1.5;
			amplitudeAdjustment = 1.2;
		} else if (latitude >= 51 && latitude <= 52 && longitude >= -3 && longitude <= -1) {
			// Bristol Channel - large tidal range
			phaseShift = 0.5;
			amplitudeAdjustment = 1.8;
		} else if (latitude >= 52 && latitude <= 53 && longitude >= 0 && longitude <= 2) {
			// East coast
			phaseShift = 2.0;
			amplitudeAdjustment = 0.9;
		}
		
		// Generate tide events (high/low) every ~6.2 hours
		let currentEventTime = currentTime;
		let isHigh = Math.sin((currentTime / (M2_PERIOD * 3600000)) * 2 * Math.PI + phaseShift) > 0;
		
		while (currentEventTime < endTime) {
			const eventDate = new Date(currentEventTime);
			
			// Calculate tide height based on location and tidal harmonics
			const M2_component = Math.cos((currentEventTime / (M2_PERIOD * 3600000)) * 2 * Math.PI + phaseShift);
			const S2_component = Math.cos((currentEventTime / (S2_PERIOD * 3600000)) * 2 * Math.PI + phaseShift * 0.5);
			
			// Base height with regional variation
			const baseHeight = amplitudeAdjustment * (3.5 + 1.5 * M2_component + 0.5 * S2_component);
			const height = Math.max(0.1, isHigh ? baseHeight : baseHeight * 0.2); // Low tide is ~20% of high tide
			
			tideEvents.push({
				time: eventDate.toISOString(),
				type: isHigh ? "high" : "low",
				height: Math.round(height * 10) / 10 // Round to 1 decimal place
			});
			
			// Next event in ~6.2 hours (quarter M2 period)
			currentEventTime += (M2_PERIOD / 2) * 3600000;
			isHigh = !isHigh; // Alternate between high and low
		}
		
		const response = {
			tideEvents,
			source: "calculated_uk_tides"
		};
		
		console.log(`🧮 Generated ${tideEvents.length} calculated tide events`);
		
		return {
			statusCode: 200,
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=1800'
			},
			body: JSON.stringify(response)
		};
		
	} catch (error) {
		console.error('Error generating calculated tides:', error);
		
		return {
			statusCode: 500,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ 
				error: 'Failed to generate tide data',
				details: error instanceof Error ? error.message : String(error)
			})
		};
	}
}
