// Quick test to check hourlyData structure
import https from "https";

async function checkHourlyDataStructure() {
	console.log("🔍 Checking hourlyData structure...");

	const url = `https://surf-finder.netlify.app/.netlify/functions/get-forecast?lat=50.5756&lng=-4.9137&spotName=Polzeath`;

	https
		.get(url, (res) => {
			let data = "";

			res.on("data", (chunk) => {
				data += chunk;
			});

			res.on("end", () => {
				try {
					const json = JSON.parse(data);
					
					if (json.forecast && json.forecast.length > 0) {
						const firstDay = json.forecast[0];
						
						console.log("📊 First day hourlyData structure:");
						console.log("- hourlyData type:", typeof firstDay.hourlyData);
						console.log("- hourlyData is array:", Array.isArray(firstDay.hourlyData));
						console.log("- hourlyData keys:", firstDay.hourlyData ? Object.keys(firstDay.hourlyData) : "null");
						
						if (firstDay.hourlyData) {
							console.log("- waveHeight type:", typeof firstDay.hourlyData.waveHeight);
							console.log("- waveHeight is array:", Array.isArray(firstDay.hourlyData.waveHeight));
							console.log("- waveHeight length:", firstDay.hourlyData.waveHeight?.length || 0);
							console.log("- times type:", typeof firstDay.hourlyData.times);
							console.log("- times is array:", Array.isArray(firstDay.hourlyData.times));
							console.log("- times length:", firstDay.hourlyData.times?.length || 0);
							
							if (firstDay.hourlyData.waveHeight && firstDay.hourlyData.waveHeight.length > 0) {
								console.log("- Sample waveHeight values:", firstDay.hourlyData.waveHeight.slice(0, 3));
							}
							if (firstDay.hourlyData.times && firstDay.hourlyData.times.length > 0) {
								console.log("- Sample times:", firstDay.hourlyData.times.slice(0, 3));
							}
						}
					}
				} catch (e) {
					console.error("❌ Parse error:", e.message);
				}
			});
		})
		.on("error", (err) => {
			console.error("❌ Request error:", err.message);
		});
}

checkHourlyDataStructure();
