#!/usr/bin/env node

// Simple test to check API quota status
const https = require("https");

function checkAPIQuota() {
	console.log("🔍 CHECKING STORMGLASS API QUOTA STATUS");
	console.log("======================================");

	// Use a simple marine data request with minimal quota cost
	const lat = 50.5167; // Wadebridge
	const lng = -4.8167;

	// Just get current weather data (cheaper than tide extremes)
	const now = new Date();
	const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

	const startTime = now.toISOString();
	const endTime = oneHourLater.toISOString();

	const url = `https://api.stormglass.io/v2/weather/point?lat=${lat}&lng=${lng}&params=waveHeight&start=${startTime}&end=${endTime}`;

	const options = {
		headers: {
			Authorization:
				"cce74f04-1cbe-11ee-86b2-0242ac130002-cce74f90-1cbe-11ee-86b2-0242ac130002",
		},
	};

	console.log(`📞 Testing API quota with minimal request...`);

	const req = https.request(url, options, (res) => {
		let data = "";

		res.on("data", (chunk) => {
			data += chunk;
		});

		res.on("end", () => {
			try {
				const result = JSON.parse(data);

				console.log(`\n📊 API Response Status: ${res.statusCode}`);

				if (res.statusCode === 402) {
					console.log(`❌ API QUOTA EXCEEDED`);
					console.log(
						`📈 Daily Quota: ${result.meta?.dailyQuota || "unknown"}`
					);
					console.log(
						`📊 Requests Used: ${result.meta?.requestCount || "unknown"}`
					);
					console.log(
						`\n🚨 IMPORTANT: Your app might be serving cached/stale tide data!`
					);
					console.log(`\n💡 SOLUTIONS:`);
					console.log(`   1. Wait 24 hours for quota reset`);
					console.log(`   2. Upgrade to paid StormGlass plan`);
					console.log(
						`   3. Implement better caching to reduce API calls`
					);
					console.log(`   4. Consider alternative tide APIs`);
				} else if (res.statusCode === 200) {
					console.log(`✅ API Working - Quota Available`);
					console.log(
						`📈 Daily Quota: ${result.meta?.dailyQuota || "unknown"}`
					);
					console.log(
						`📊 Requests Used: ${result.meta?.requestCount || "unknown"}`
					);
				} else {
					console.log(`⚠️  Unexpected status: ${res.statusCode}`);
					console.log(`Response: ${data}`);
				}
			} catch (error) {
				console.log(`❌ Parse Error: ${error.message}`);
				console.log(`Raw response: ${data}`);
			}
		});
	});

	req.on("error", (error) => {
		console.log(`❌ Request Error: ${error.message}`);
	});

	req.end();
}

checkAPIQuota();
