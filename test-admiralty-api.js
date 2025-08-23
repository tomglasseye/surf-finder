// Test the UK Admiralty API directly to see the raw data
import fetch from "node-fetch";

const API_KEY = "06332f59fe2b44b9b546be924f8df5f8";

async function testAdmiraltyAPI() {
	try {
		console.log("🌊 TESTING UK ADMIRALTY API DIRECTLY...");

		// Polzeath coordinates
		const latitude = 50.5756;
		const longitude = -4.9137;

		// Step 1: Find nearest tidal station
		console.log("\n📍 Finding nearest tidal station...");
		const stationsUrl = `https://admiraltyapi.azure-api.net/uktidalapi/api/V1/Stations?Radius=50&Lat=${latitude}&Lon=${longitude}`;

		const stationsResponse = await fetch(stationsUrl, {
			headers: {
				"Ocp-Apim-Subscription-Key": API_KEY,
			},
		});

		if (!stationsResponse.ok) {
			throw new Error(`Stations API failed: ${stationsResponse.status}`);
		}

		const stations = await stationsResponse.json();
		console.log(`Found ${stations.features.length} stations`);

		if (stations.features.length === 0) {
			throw new Error("No tidal stations found");
		}

		const closestStation = stations.features[0];
		console.log(
			`Closest station: ${closestStation.properties.Name} (ID: ${closestStation.properties.Id})`
		);

		// Step 2: Get tide events for today
		console.log("\n🌊 Getting tide events...");
		const today = new Date();
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);

		const startDate = today.toISOString().split("T")[0];
		const endDate = tomorrow.toISOString().split("T")[0];

		const eventsUrl = `https://admiraltyapi.azure-api.net/uktidalapi/api/V1/Stations/${closestStation.properties.Id}/TidalEvents?StartDateTime=${startDate}&EndDateTime=${endDate}`;

		const eventsResponse = await fetch(eventsUrl, {
			headers: {
				"Ocp-Apim-Subscription-Key": API_KEY,
			},
		});

		if (!eventsResponse.ok) {
			throw new Error(`Events API failed: ${eventsResponse.status}`);
		}

		const events = await eventsResponse.json();

		console.log("\n📊 RAW TIDE EVENTS:");
		console.log(JSON.stringify(events, null, 2));

		console.log("\n🌊 FORMATTED TIDE EVENTS:");
		events.forEach((event, index) => {
			const time = new Date(event.DateTime);
			console.log(
				`${index + 1}. ${event.EventType} at ${time.toLocaleTimeString()} - ${event.Height}m`
			);
		});

		// Calculate height range
		const heights = events.map((e) => parseFloat(e.Height));
		console.log("\n📈 HEIGHT STATISTICS:");
		console.log(`Min: ${Math.min(...heights)}m`);
		console.log(`Max: ${Math.max(...heights)}m`);
		console.log(
			`Range: ${(Math.max(...heights) - Math.min(...heights)).toFixed(2)}m`
		);
	} catch (error) {
		console.error("❌ Error:", error.message);
	}
}

testAdmiraltyAPI();
