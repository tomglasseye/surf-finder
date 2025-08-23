import type { Context } from "@netlify/functions";

interface AdmiraltyStationResponse {
	Features: Array<{
		Id: string;
		Name: string;
		Country: string;
		ContinuousHeightsAvailable: boolean;
	}>;
}

interface AdmiraltyTideResponse {
	tideEvents: Array<{
		time: string;
		type: "high" | "low";
		height: number;
	}>;
	source: string;
}

export default async (request: Request, context: Context) => {
	try {
		const url = new URL(request.url);
		const lat = url.searchParams.get('lat');
		const lng = url.searchParams.get('lng');
		const start = url.searchParams.get('start');
		const end = url.searchParams.get('end');

		if (!lat || !lng || !start) {
			return new Response(
				JSON.stringify({ error: 'Missing required parameters: lat, lng, start' }),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			);
		}

		const ADMIRALTY_API_KEY = process.env.ADMIRALTY_API_KEY;
		if (!ADMIRALTY_API_KEY) {
			throw new Error('ADMIRALTY_API_KEY not configured');
		}

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
			throw new Error(`Station API error: ${stationResponse.status}`);
		}

		const stationData: AdmiraltyStationResponse = await stationResponse.json();
		
		if (!stationData.Features || stationData.Features.length === 0) {
			throw new Error('No tide stations found near location');
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
			throw new Error(`Tide API error: ${tideResponse.status}`);
		}

		const tideData = await tideResponse.json();

		// Transform Admiralty format to our format
		const tideEvents = tideData.map((event: any) => ({
			time: event.DateTime,
			type: event.EventType.toLowerCase() as "high" | "low",
			height: event.Height
		}));

		const response: AdmiraltyTideResponse = {
			tideEvents,
			source: "admiralty_uk"
		};

		console.log(`🌊 Retrieved ${tideEvents.length} tide events for ${nearestStation.Name}`);

		return new Response(JSON.stringify(response), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=1800' // Cache for 30 minutes
			}
		});

	} catch (error) {
		console.error('Admiralty API error:', error);
		
		return new Response(
			JSON.stringify({ 
				error: 'Failed to fetch tide data from Admiralty API',
				details: error instanceof Error ? error.message : String(error)
			}),
			{ 
				status: 500, 
				headers: { 'Content-Type': 'application/json' } 
			}
		);
	}
};