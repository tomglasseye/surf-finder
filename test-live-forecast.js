// Test what data we're actually getting from the live function
import fetch from "node-fetch";

async function testLiveForecast() {
	try {
		console.log("🔍 Testing live forecast API...");

		// Polzeath coordinates
		const latitude = 50.5756;
		const longitude = -4.9137;

		// Test the deployed function
		const response = await fetch(
			`https://surf-finder.netlify.app/.netlify/functions/get-forecast?lat=${latitude}&lng=${longitude}&spotName=Polzeath`
		);

		if (!response.ok) {
			console.log(
				"❌ Live API Response not OK:",
				response.status,
				response.statusText
			);
			const text = await response.text();
			console.log("Response body:", text);
			return;
		}

		const data = await response.json();

		console.log("\n📊 LIVE FORECAST RESPONSE:");

		// Check the first day's data
		if (data.forecast && data.forecast[0]) {
			const firstDay = data.forecast[0];
			console.log("\n🗓️ First Day Data:");
			console.log(`Date: ${firstDay.date}`);
			console.log(`Day Name: ${firstDay.dayName}`);

			if (firstDay.tideData) {
				console.log("\n🌊 TIDE DATA:");
				console.log(`Current Level: ${firstDay.tideData.currentLevel}`);
				console.log(`Is Rising: ${firstDay.tideData.isRising}`);
				console.log(`Next High: ${firstDay.tideData.nextHigh}`);
				console.log(`Next Low: ${firstDay.tideData.nextLow}`);
				console.log(`Source: ${firstDay.tideData.source}`);

				if (firstDay.tideData.tideEvents) {
					console.log("\n📈 TIDE EVENTS:");
					firstDay.tideData.tideEvents.forEach((event, index) => {
						const time = new Date(event.time);
						console.log(
							`${index + 1}. ${event.type.toUpperCase()} at ${time.toLocaleTimeString()} - ${event.height}m`
						);
					});
				} else {
					console.log("❌ No tideEvents array found!");
				}
			} else {
				console.log("❌ No tideData found!");
			}
		}

		// Check all days for pattern
		console.log("\n📅 ALL DAYS TIDE PATTERN:");
		if (data.forecast) {
			data.forecast.forEach((day, index) => {
				if (
					day.tideData &&
					day.tideData.tideEvents &&
					day.tideData.tideEvents.length > 0
				) {
					const highTide = day.tideData.tideEvents.find(
						(e) => e.type === "high"
					);
					if (highTide) {
						const time = new Date(highTide.time);
						console.log(
							`Day ${index + 1}: High tide at ${time.toLocaleTimeString()}`
						);
					}
				} else {
					console.log(
						`Day ${index + 1}: No tide events or using fallback data`
					);
				}
			});
		}
	} catch (error) {
		console.error("❌ Error:", error.message);
	}
}

testLiveForecast();
