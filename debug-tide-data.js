// Simple script to display the actual tide data we're receiving
import fetch from "node-fetch";

async function showTideData() {
	try {
		console.log("🌊 FETCHING TIDE DATA FOR POLZEATH...");

		// Polzeath coordinates
		const latitude = 50.5756;
		const longitude = -4.9137;

		const response = await fetch(
			`http://localhost:8888/.netlify/functions/get-forecast?lat=${latitude}&lng=${longitude}&spotName=Polzeath`
		);

		if (!response.ok) {
			console.log(
				"❌ API Response not OK:",
				response.status,
				response.statusText
			);
			const text = await response.text();
			console.log("Response body:", text);
			return;
		}

		const data = await response.json();

		console.log("\n📊 FULL API RESPONSE:");
		console.log(JSON.stringify(data, null, 2));

		if (data.tideData && data.tideData.tideEvents) {
			console.log("\n🌊 TIDE EVENTS:");
			data.tideData.tideEvents.forEach((event, index) => {
				const time = new Date(event.time);
				console.log(
					`${index + 1}. ${event.type.toUpperCase()} at ${time.toLocaleTimeString()} - ${event.height}m`
				);
			});

			console.log("\n📈 HEIGHT RANGE:");
			const heights = data.tideData.tideEvents.map((e) => e.height);
			console.log(`Min: ${Math.min(...heights)}m`);
			console.log(`Max: ${Math.max(...heights)}m`);
			console.log(
				`Range: ${Math.max(...heights) - Math.min(...heights)}m`
			);
		}
	} catch (error) {
		console.error("❌ Error:", error.message);
	}
}

showTideData();
