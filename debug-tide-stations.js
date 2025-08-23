// Debug script to check tidal stations and coordinates
const API_KEY = "06332f59fe2b44b9b546be924f8df5f8";

async function debugTideStations() {
	try {
		console.log("🔍 Debugging UK Admiralty tidal stations...");

		// Test location: Polzeath (50.5689, -4.9156)
		const testLat = 50.5689;
		const testLng = -4.9156;
		console.log(`📍 Test location: ${testLat}, ${testLng} (Polzeath)`);

		// Get all stations
		const stationsResponse = await fetch(
			"https://admiraltyapi.azure-api.net/uktidalapi/api/V1/Stations",
			{
				headers: {
					"Ocp-Apim-Subscription-Key": API_KEY,
					"Content-Type": "application/json",
				},
			}
		);

		if (!stationsResponse.ok) {
			throw new Error(`Stations API error: ${stationsResponse.status}`);
		}

		const stationsData = await stationsResponse.json();
		console.log(`📊 Total stations: ${stationsData.features?.length || 0}`);

		// Find closest stations to Polzeath
		let stations = [];

		if (stationsData.features) {
			stationsData.features.forEach((station) => {
				if (station.geometry && station.geometry.coordinates) {
					// geoJSON format: [longitude, latitude]
					const stationLng = station.geometry.coordinates[0];
					const stationLat = station.geometry.coordinates[1];

					const distance = Math.sqrt(
						Math.pow(stationLat - testLat, 2) +
							Math.pow(stationLng - testLng, 2)
					);

					stations.push({
						name: station.properties.Name,
						id: station.properties.Id,
						lat: stationLat,
						lng: stationLng,
						distance: distance,
						distanceKm: (distance * 111).toFixed(1), // Rough conversion to km
					});
				}
			});
		}

		// Sort by distance and show top 5
		stations.sort((a, b) => a.distance - b.distance);
		const top5 = stations.slice(0, 5);

		console.log(`\n🎯 Top 5 closest stations to Polzeath:`);
		top5.forEach((station, i) => {
			console.log(`${i + 1}. ${station.name}`);
			console.log(`   ID: ${station.id}`);
			console.log(`   Location: ${station.lat}, ${station.lng}`);
			console.log(`   Distance: ${station.distanceKm}km`);
			console.log("");
		});

		// Test tide data for the closest station
		const closestStation = top5[0];
		console.log(`🌊 Testing tide data for: ${closestStation.name}`);

		const today = new Date().toISOString().split("T")[0];
		const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
			.toISOString()
			.split("T")[0];

		const tideResponse = await fetch(
			`https://admiraltyapi.azure-api.net/uktidalapi/api/V1/Stations/${closestStation.id}/TidalEvents?StartDate=${today}&EndDate=${tomorrow}`,
			{
				headers: {
					"Ocp-Apim-Subscription-Key": API_KEY,
					"Content-Type": "application/json",
				},
			}
		);

		if (tideResponse.ok) {
			const tideEvents = await tideResponse.json();
			console.log(`✅ Tide events: ${tideEvents.length}`);

			if (tideEvents.length > 0) {
				console.log(`\n📋 First few tide events:`);
				tideEvents.slice(0, 4).forEach((event, i) => {
					const eventTime = new Date(event.DateTime);
					console.log(
						`${i + 1}. ${event.EventType} at ${eventTime.toLocaleString("en-GB")} - ${event.Height}m`
					);
				});
			}
		} else {
			const errorText = await tideResponse.text();
			console.log(`❌ Tide data error: ${errorText}`);
		}
	} catch (error) {
		console.error(`❌ Error: ${error.message}`);
	}
}

debugTideStations();
