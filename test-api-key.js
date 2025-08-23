// Test the actual Admiralty API with your key
const API_KEY = "06332f59fe2b44b9b546be924f8df5f8";

async function testAdmiraltyAPI() {
	try {
		console.log("🧪 Testing UK Admiralty API access...");

		// Test stations API
		const stationsResponse = await fetch(
			"https://admiraltyapi.azure-api.net/uktidalapi/api/V1/Stations",
			{
				headers: {
					"Ocp-Apim-Subscription-Key": API_KEY,
					"Content-Type": "application/json",
				},
			}
		);

		console.log(`📡 Status: ${stationsResponse.status}`);

		if (stationsResponse.ok) {
			const data = await stationsResponse.json();
			console.log(
				`✅ SUCCESS: ${data.features?.length || 0} stations loaded`
			);
			console.log(
				`🎉 Your API key works! Issue is likely with Netlify environment variable.`
			);

			// Test one station
			if (data.features && data.features.length > 0) {
				const station = data.features[0];
				console.log(`📍 Sample station: ${station.properties.Name}`);

				const today = new Date().toISOString().split("T")[0];
				const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
					.toISOString()
					.split("T")[0];

				const tideResponse = await fetch(
					`https://admiraltyapi.azure-api.net/uktidalapi/api/V1/Stations/${station.properties.Id}/TidalEvents?StartDate=${today}&EndDate=${tomorrow}`,
					{
						headers: {
							"Ocp-Apim-Subscription-Key": API_KEY,
							"Content-Type": "application/json",
						},
					}
				);

				console.log(`🌊 Tide data status: ${tideResponse.status}`);

				if (tideResponse.ok) {
					const tideEvents = await tideResponse.json();
					console.log(`✅ Tide data: ${tideEvents.length} events`);
				} else {
					const errorText = await tideResponse.text();
					console.log(`❌ Tide API error: ${errorText}`);
				}
			}
		} else {
			const errorText = await stationsResponse.text();
			console.log(`❌ API Error: ${errorText}`);
		}
	} catch (error) {
		console.error(`❌ Network error: ${error.message}`);
	}
}

testAdmiraltyAPI();
