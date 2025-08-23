// Check if the Admiralty API is working on live site
import fetch from "node-fetch";

async function checkAdmiraltyAPIStatus() {
	try {
		console.log("🔍 Checking Admiralty API status on live site...");

		// Call a test endpoint that tries to use the API directly
		const response = await fetch(
			"https://surf-finder.netlify.app/.netlify/functions/get-forecast?lat=50.5756&lng=-4.9137&spotName=Polzeath&debug=true"
		);

		if (!response.ok) {
			console.log(
				"❌ Live API Response not OK:",
				response.status,
				response.statusText
			);
			return;
		}

		const data = await response.json();

		// Look for debug information or API call results
		console.log("\n📊 CHECKING FOR ADMIRALTY API CALLS:");
		console.log("Response keys:", Object.keys(data));

		if (data.debug) {
			console.log("Debug info:", data.debug);
		}

		// Check if any day has admiralty source
		if (data.forecast) {
			const admiraltySources = data.forecast.map((day, index) => ({
				day: index + 1,
				source: day.tideData?.source || "unknown",
				hasEvents: day.tideData?.tideEvents?.length || 0,
			}));

			console.log("\n🌊 TIDE DATA SOURCES BY DAY:");
			admiraltySources.forEach(({ day, source, hasEvents }) => {
				console.log(`Day ${day}: ${source} (${hasEvents} events)`);
			});

			const admiraltyDays = admiraltySources.filter(
				(s) => s.source === "admiralty_uk"
			).length;
			const fallbackDays = admiraltySources.filter(
				(s) => s.source === "enhanced_calculation"
			).length;

			console.log(`\n📈 SUMMARY:`);
			console.log(`Admiralty API days: ${admiraltyDays}/5`);
			console.log(`Fallback days: ${fallbackDays}/5`);

			if (fallbackDays === 5) {
				console.log("\n❌ ALL DAYS USING FALLBACK - API IS FAILING");
			}
		}
	} catch (error) {
		console.error("❌ Error:", error.message);
	}
}

checkAdmiraltyAPIStatus();
