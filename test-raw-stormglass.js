#!/usr/bin/env node

// Test StormGlass API directly to see what raw data it returns

import https from "https";

function testStormGlassRaw() {
	console.log("🌊 TESTING STORMGLASS API DIRECTLY");
	console.log("==================================");

	// Test with exact Wadebridge coordinates
	const lat = 50.5167; // Wadebridge
	const lng = -4.8167;

	// Get current time and time windows
	const now = new Date();
	const oneDayBefore = new Date(now.getTime() - 24 * 60 * 60 * 1000);
	const twoDaysLater = new Date(now.getTime() + 48 * 60 * 60 * 1000);

	const startTime = oneDayBefore.toISOString();
	const endTime = twoDaysLater.toISOString();

	console.log(`📍 Location: Wadebridge (${lat}, ${lng})`);
	console.log(`⏰ Time window: ${startTime} to ${endTime}`);

	const url = `https://api.stormglass.io/v2/tide/extremes/point?lat=${lat}&lng=${lng}&start=${startTime}&end=${endTime}`;
	console.log(`📞 StormGlass URL: ${url}`);

	const options = {
		headers: {
			Authorization:
				"cce74f04-1cbe-11ee-86b2-0242ac130002-cce74f90-1cbe-11ee-86b2-0242ac130002",
		},
	};

	const req = https.request(url, options, (res) => {
		let data = "";

		res.on("data", (chunk) => {
			data += chunk;
		});

		res.on("end", () => {
			try {
				const result = JSON.parse(data);

				console.log(`\n📊 STORMGLASS RAW RESPONSE:`);
				console.log(`Status: ${res.statusCode}`);

				if (result.data && result.data.length > 0) {
					console.log(
						`📈 Found ${result.data.length} tide extremes:`
					);

					const currentTime = now.getTime();

					// Show all extremes
					result.data.forEach((extreme, index) => {
						const extremeTime = new Date(extreme.time);
						const isPast = extremeTime.getTime() < currentTime;
						const dayLabel =
							extremeTime.toDateString() === now.toDateString()
								? "TODAY"
								: extremeTime.toDateString() ===
									  new Date(
											now.getTime() + 24 * 60 * 60 * 1000
									  ).toDateString()
									? "TOMORROW"
									: extremeTime.toLocaleDateString("en-GB");

						console.log(
							`   ${index + 1}. ${extreme.type.toUpperCase()} - ${extremeTime.toLocaleString("en-GB", { timeZone: "Europe/London" })} BST (${dayLabel}) ${isPast ? "(past)" : "(future)"} - Height: ${extreme.height}m`
						);
					});

					// Compare with BBC data
					console.log(`\n🔍 COMPARISON WITH BBC:`);
					console.log(
						`BBC Today (22 Aug): High 05:40, Low 15:23, High 17:58`
					);
					console.log(`BBC Tomorrow (23 Aug): Low 03:52, High 06:22`);

					// Find today's tides in StormGlass data
					const todayStart = new Date(
						now.getFullYear(),
						now.getMonth(),
						now.getDate()
					);
					const tomorrowStart = new Date(
						todayStart.getTime() + 24 * 60 * 60 * 1000
					);

					const todayTides = result.data.filter((extreme) => {
						const extremeTime = new Date(extreme.time);
						return (
							extremeTime >= todayStart &&
							extremeTime < tomorrowStart
						);
					});

					const tomorrowTides = result.data.filter((extreme) => {
						const extremeTime = new Date(extreme.time);
						return (
							extremeTime >= tomorrowStart &&
							extremeTime <
								new Date(
									tomorrowStart.getTime() +
										24 * 60 * 60 * 1000
								)
						);
					});

					console.log(`\nStormGlass Today (22 Aug):`);
					todayTides.forEach((tide) => {
						const time = new Date(tide.time);
						console.log(
							`   ${tide.type.toUpperCase()}: ${time.toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour12: false })} BST`
						);
					});

					console.log(`\nStormGlass Tomorrow (23 Aug):`);
					tomorrowTides.forEach((tide) => {
						const time = new Date(tide.time);
						console.log(
							`   ${tide.type.toUpperCase()}: ${time.toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour12: false })} BST`
						);
					});
				} else {
					console.log(`❌ No tide data returned`);
					console.log(`Raw response: ${data}`);
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

testStormGlassRaw();
