// Simplified version of get-tide-data function for testing

export const handler = async (event, context) => {
	const { lat, lng, start, end } = event.queryStringParameters || {};

	if (!lat || !lng || !start) {
		return {
			statusCode: 400,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ error: 'Missing required parameters: lat, lng, start' })
		};
	}

	// For now, just return calculated tides to test if the function works at all
	const latitude = parseFloat(lat);
	const longitude = parseFloat(lng);
	const startDate = new Date(start);
	const endDate = end ? new Date(end) : new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
	
	console.log(`🧮 Generating calculated tides for ${latitude}, ${longitude}`);
	
	const tideEvents = [];
	const M2_PERIOD = 12.420601; // Main lunar semi-diurnal period in hours
	
	// Generate a few test tide events
	let currentTime = startDate.getTime();
	let isHigh = true;
	
	for (let i = 0; i < 4; i++) {
		const eventDate = new Date(currentTime);
		const height = isHigh ? 4.5 + Math.random() * 2 : 0.5 + Math.random() * 1;
		
		tideEvents.push({
			time: eventDate.toISOString(),
			type: isHigh ? "high" : "low",
			height: Math.round(height * 10) / 10
		});
		
		currentTime += (M2_PERIOD / 2) * 3600000; // ~6.2 hours later
		isHigh = !isHigh;
	}
	
	const response = {
		tideEvents,
		source: "calculated_uk_tides"
	};
	
	console.log(`🧮 Generated ${tideEvents.length} test tide events`);
	
	return {
		statusCode: 200,
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': 'public, max-age=1800'
		},
		body: JSON.stringify(response)
	};
};
