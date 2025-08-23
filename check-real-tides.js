// Test real StormGlass tide data
const https = require("https");

console.log("🔍 Testing actual StormGlass API call...");

const apiKey =
	process.env.STORMGLASS_API_KEY ||
	"34b2ddd0-7e96-11ef-a585-0242ac130004-34b2de56-7e96-11ef-a585-0242ac130004";
const lat = 50.5429; // Polzeath coordinates
const lng = -4.9312;

const now = Math.floor(Date.now() / 1000);
const tomorrow = now + 86400;

const url = `https://api.stormglass.io/v2/tide/extremes/point?lat=${lat}&lng=${lng}&start=${now}&end=${tomorrow}`;

console.log("API URL:", url);

const options = {
	headers: {
		Authorization: apiKey,
	},
};

https
	.get(url, options, (res) => {
		let data = "";
		res.on("data", (chunk) => (data += chunk));
		res.on("end", () => {
			try {
				const result = JSON.parse(data);
				console.log("\n📊 Real StormGlass tide extremes for next 24h:");
				console.log(
					"==================================================="
				);

				if (result.data && result.data.length > 0) {
					result.data.forEach((extreme, i) => {
						const time = new Date(extreme.time);
						console.log(
							`${i + 1}. ${extreme.type.toUpperCase()} tide: ${time.toLocaleString("en-GB")} - ${extreme.height.toFixed(2)}m`
						);
					});

					console.log(
						"\n🕐 Current time:",
						new Date().toLocaleString("en-GB")
					);

					// Find next tide
					const currentTime = Date.now();
					const nextTide = result.data.find(
						(extreme) =>
							new Date(extreme.time).getTime() > currentTime
					);
					if (nextTide) {
						const hoursToNext =
							(new Date(nextTide.time).getTime() - currentTime) /
							(1000 * 60 * 60);
						console.log(
							`⏰ Next tide: ${nextTide.type.toUpperCase()} in ${hoursToNext.toFixed(1)} hours`
						);
					}
				} else {
					console.log("❌ No tide data returned");
					console.log("Response:", result);
				}
			} catch (e) {
				console.log("❌ Parse error:", e.message);
				console.log("Raw response:", data);
			}
		});
	})
	.on("error", (e) => {
		console.error("❌ API Error:", e.message);
	});
