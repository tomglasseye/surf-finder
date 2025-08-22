#!/usr/bin/env node

// Check the specific tide times our API is returning vs BBC

import https from "https";

function testTideTimes() {
	console.log("🕐 TIDE TIMES COMPARISON");
	console.log("========================");

	console.log("📊 BBC Wadebridge Times (22 Aug):");
	console.log("   🌊 High: 05:40 BST");
	console.log("   🌊 Low:  15:23 BST (3:23pm)");
	console.log("   🌊 High: 17:58 BST (5:58pm)");
	console.log("\n📊 BBC Wadebridge Times (23 Aug):");
	console.log("   🌊 Low:  03:52 BST");
	console.log("   🌊 High: 06:22 BST");

	const timestamp = Date.now();
	const url = `https://surf-finder.netlify.app/.netlify/functions/get-forecast?spotName=Polzeath&lat=50.5689&lng=-4.9156&_t=${timestamp}`;

	console.log(`\n🔍 Testing our API for Polzeath:`);
	console.log(`📞 ${url}`);

	https
		.get(url, (res) => {
			let data = "";

			res.on("data", (chunk) => {
				data += chunk;
			});

			res.on("end", () => {
				try {
					const result = JSON.parse(data);

					if (
						result.forecast &&
						result.forecast[0] &&
						result.forecast[0].tideData
					) {
						const tideData = result.forecast[0].tideData;

						console.log(`\n📊 OUR API Times:`);
						console.log(
							`   🌊 Next High: ${new Date(tideData.nextHigh).toLocaleString("en-GB", { timeZone: "Europe/London" })} BST`
						);
						console.log(
							`   🌊 Next Low:  ${new Date(tideData.nextLow).toLocaleString("en-GB", { timeZone: "Europe/London" })} BST`
						);
						console.log(`   📡 Source: ${tideData.source}`);
						console.log(
							`   📈 Direction: ${tideData.isRising ? "RISING" : "FALLING"}`
						);
						console.log(
							`   🌊 Level: ${(tideData.currentLevel * 100).toFixed(1)}%`
						);

						// Parse the times for comparison
						const nextHighTime = new Date(tideData.nextHigh);
						const nextLowTime = new Date(tideData.nextLow);

						// Expected BBC times for comparison
						const bbcNextLow = new Date(
							"2025-08-23T03:52:00+01:00"
						); // 03:52 BST tomorrow
						const bbcNextHigh = new Date(
							"2025-08-23T06:22:00+01:00"
						); // 06:22 BST tomorrow

						console.log(`\n🔍 COMPARISON:`);
						console.log(
							`   Expected Low:  23/08/2025, 03:52:00 BST`
						);
						console.log(
							`   Our API Low:   ${nextLowTime.toLocaleString("en-GB", { timeZone: "Europe/London" })} BST`
						);

						const lowTimeDiff =
							Math.abs(
								nextLowTime.getTime() - bbcNextLow.getTime()
							) /
							(1000 * 60);
						console.log(
							`   ⏱️ Low Time Difference: ${lowTimeDiff.toFixed(0)} minutes`
						);

						console.log(
							`\n   Expected High: 23/08/2025, 06:22:00 BST`
						);
						console.log(
							`   Our API High:  ${nextHighTime.toLocaleString("en-GB", { timeZone: "Europe/London" })} BST`
						);

						const highTimeDiff =
							Math.abs(
								nextHighTime.getTime() - bbcNextHigh.getTime()
							) /
							(1000 * 60);
						console.log(
							`   ⏱️ High Time Difference: ${highTimeDiff.toFixed(0)} minutes`
						);

						console.log(`\n🎯 ANALYSIS:`);
						if (lowTimeDiff < 30 && highTimeDiff < 30) {
							console.log(
								`✅ Times match BBC within 30 minutes - acceptable accuracy`
							);
						} else if (lowTimeDiff < 60 && highTimeDiff < 60) {
							console.log(
								`⚠️ Times differ by 30-60 minutes - moderate accuracy`
							);
						} else {
							console.log(
								`❌ Times differ significantly from BBC data`
							);
							console.log(`   This could be due to:`);
							console.log(
								`   1. Different tidal reference points`
							);
							console.log(
								`   2. StormGlass using different data source than BBC`
							);
							console.log(
								`   3. Location coordinate differences`
							);
						}

						// Check if using enhanced calculation vs real API
						if (tideData.source === "enhanced_calculation") {
							console.log(
								`\n⚠️ WARNING: Using enhanced calculation instead of StormGlass API!`
							);
							console.log(
								`   This means the StormGlass API might not be working for this location.`
							);
						} else if (tideData.source === "stormglass") {
							console.log(`\n✅ Using real StormGlass API data`);
						}
					} else {
						console.log("❌ No tide data found in API response");
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

testTideTimes();
