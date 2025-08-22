#!/usr/bin/env node

// Test with cache-busting parameter to force fresh data

import https from "https";

function testWithCacheBusting() {
	console.log("🔄 Testing Live Function with Cache Busting");
	console.log("===========================================");

	const spotName = "Fistral Beach";
	const lat = 50.4119;
	const lng = -5.0757;
	const timestamp = Date.now(); // Cache busting

	const url = `https://surf-finder.netlify.app/.netlify/functions/get-forecast?spotName=${encodeURIComponent(spotName)}&lat=${lat}&lng=${lng}&_t=${timestamp}`;

	console.log(`📞 Calling with cache buster: ${url}`);
	console.log(
		`⏰ Time: ${new Date().toLocaleString("en-GB", { timeZone: "Europe/London" })} BST`
	);

	https
		.get(url, (res) => {
			let data = "";

			res.on("data", (chunk) => {
				data += chunk;
			});

			res.on("end", () => {
				try {
					const result = JSON.parse(data);

					console.log("\n🎯 TIDE DATA RESULT:");
					console.log(`Status: ${res.statusCode}`);

					if (
						result.forecast &&
						result.forecast[0] &&
						result.forecast[0].tideData
					) {
						const tideData = result.forecast[0].tideData;
						console.log(
							`🌊 Level: ${(tideData.currentLevel * 100).toFixed(1)}%`
						);
						console.log(
							`📈 Direction: ${tideData.isRising ? "🔼 RISING ❌" : "🔽 FALLING ✅"}`
						);
						console.log(`📡 Source: ${tideData.source}`);
						console.log(
							`⏰ Next High: ${new Date(tideData.nextHigh).toLocaleString("en-GB", { timeZone: "Europe/London" })} BST`
						);
						console.log(
							`⏰ Next Low: ${new Date(tideData.nextLow).toLocaleString("en-GB", { timeZone: "Europe/London" })} BST`
						);

						console.log(`\n✅ CONCLUSION:`);
						if (!tideData.isRising) {
							console.log(
								`The API is correctly showing FALLING tide!`
							);
							console.log(
								`If your browser still shows "high tide", try:`
							);
							console.log(`1. Hard refresh (Ctrl+F5)`);
							console.log(`2. Clear browser cache`);
							console.log(`3. Open in incognito/private mode`);
						} else {
							console.log(
								`❌ Still showing RISING - something is wrong`
							);
						}
					} else {
						console.log("❌ No tide data found in response");
					}
				} catch (error) {
					console.log(`❌ Parse Error: ${error.message}`);
				}
			});
		})
		.on("error", (error) => {
			console.log(`❌ Request Error: ${error.message}`);
		});
}

testWithCacheBusting();
