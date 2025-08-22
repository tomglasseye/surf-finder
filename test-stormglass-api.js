#!/usr/bin/env node

// Test StormGlass API with your actual key
// Manually set the API key for testing
const STORMGLASS_API_KEY =
	"cce74f04-1cbe-11ee-86b2-0242ac130002-cce74f90-1cbe-11ee-86b2-0242ac130002";

async function testStormGlassAPI() {
	console.log("🧪 Testing StormGlass API with Real Key");
	console.log("=======================================");

	const apiKey = STORMGLASS_API_KEY;

	if (!apiKey) {
		console.log("❌ No STORMGLASS_API_KEY found in environment");
		return;
	}

	console.log(`🔑 API Key found: ${apiKey.substring(0, 12)}...`);

	// Test location: Fistral Beach, Newquay
	const lat = 50.4119;
	const lng = -5.0757;

	const now = new Date();
	const twoDaysLater = new Date(now.getTime() + 48 * 3600000);

	const startTime = now.toISOString();
	const endTime = twoDaysLater.toISOString();

	const url = `https://api.stormglass.io/v2/tide/extremes/point?lat=${lat}&lng=${lng}&start=${startTime}&end=${endTime}`;

	console.log(`📍 Testing location: ${lat}, ${lng} (Fistral Beach)`);
	console.log(`⏰ Time range: ${startTime} to ${endTime}`);
	console.log(`🌐 URL: ${url}`);

	try {
		console.log("\n🔄 Making API request...");

		const response = await fetch(url, {
			headers: {
				Authorization: apiKey,
			},
		});

		console.log(`📡 Response status: ${response.status}`);

		if (response.ok) {
			const data = await response.json();
			console.log("✅ API Success!");
			console.log(
				`📊 Tide extremes found: ${data.data ? data.data.length : 0}`
			);

			if (data.data && data.data.length > 0) {
				console.log("\n🌊 Tide Data:");
				data.data.slice(0, 6).forEach((extreme) => {
					const time = new Date(extreme.time).toLocaleString(
						"en-GB",
						{ timeZone: "Europe/London" }
					);
					console.log(
						`   ${extreme.type.toUpperCase()}: ${time} BST (${extreme.height}m)`
					);
				});

				// Test our processing function with this real data
				console.log(
					"\n🧮 Testing direction calculation with real data:"
				);
				const currentTime = now.getTime();

				const allExtremes = data.data.sort(
					(a, b) => new Date(a.time) - new Date(b.time)
				);

				for (let i = 0; i < allExtremes.length - 1; i++) {
					const currentExtreme = allExtremes[i];
					const nextExtreme = allExtremes[i + 1];
					const currentExtremeTime = new Date(
						currentExtreme.time
					).getTime();
					const nextExtremeTime = new Date(
						nextExtreme.time
					).getTime();

					if (
						currentExtremeTime <= currentTime &&
						currentTime <= nextExtremeTime
					) {
						const timeDiff = nextExtremeTime - currentExtremeTime;
						const currentProgress =
							(currentTime - currentExtremeTime) / timeDiff;

						console.log(`⏰ Current period:`);
						console.log(
							`   From: ${currentExtreme.type.toUpperCase()} at ${new Date(currentExtreme.time).toLocaleString("en-GB", { timeZone: "Europe/London" })} BST`
						);
						console.log(
							`   To:   ${nextExtreme.type.toUpperCase()} at ${new Date(nextExtreme.time).toLocaleString("en-GB", { timeZone: "Europe/London" })} BST`
						);
						console.log(
							`   Progress: ${(currentProgress * 100).toFixed(1)}%`
						);

						let isRising;
						if (
							currentExtreme.type === "high" &&
							nextExtreme.type === "low"
						) {
							isRising = false;
							console.log(`   🔽 FALLING TIDE: High → Low`);
						} else if (
							currentExtreme.type === "low" &&
							nextExtreme.type === "high"
						) {
							isRising = true;
							console.log(`   🔼 RISING TIDE: Low → High`);
						}

						console.log(
							`\n🎯 StormGlass says tide is: ${isRising ? "🔼 RISING" : "🔽 FALLING"}`
						);
						console.log(
							`📊 This should match BBC data for Cornwall!`
						);
						break;
					}
				}
			}
		} else {
			const errorText = await response.text();
			console.log(`❌ API Error: ${response.status}`);
			console.log(`📄 Error details: ${errorText}`);

			if (response.status === 401) {
				console.log("🔑 Authentication failed - check API key");
			} else if (response.status === 429) {
				console.log("⏰ Rate limit exceeded");
			}
		}
	} catch (error) {
		console.log(`💥 Request failed: ${error.message}`);
	}
}

testStormGlassAPI().catch(console.error);
