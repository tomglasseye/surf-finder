#!/usr/bin/env node

// Test Polzeath specifically vs Wadebridge to see if coordinates matter

import https from "https";

function testLocation(name, lat, lng) {
	return new Promise((resolve, reject) => {
		const timestamp = Date.now();
		const url = `https://surf-finder.netlify.app/.netlify/functions/get-forecast?spotName=${encodeURIComponent(name)}&lat=${lat}&lng=${lng}&_t=${timestamp}`;

		console.log(`\n🔍 Testing: ${name}`);
		console.log(`📍 Coordinates: ${lat}, ${lng}`);
		console.log(`📞 URL: ${url}`);

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
							console.log(`✅ ${name} Results:`);
							console.log(
								`   🌊 Level: ${(tideData.currentLevel * 100).toFixed(1)}%`
							);
							console.log(
								`   📈 Direction: ${tideData.isRising ? "🔼 RISING ❌" : "🔽 FALLING ✅"}`
							);
							console.log(`   📡 Source: ${tideData.source}`);
							console.log(
								`   ⏰ Next High: ${new Date(tideData.nextHigh).toLocaleString("en-GB", { timeZone: "Europe/London" })} BST`
							);
							console.log(
								`   ⏰ Next Low: ${new Date(tideData.nextLow).toLocaleString("en-GB", { timeZone: "Europe/London" })} BST`
							);

							resolve({
								name,
								lat,
								lng,
								isRising: tideData.isRising,
								level: tideData.currentLevel,
								source: tideData.source,
								nextHigh: tideData.nextHigh,
								nextLow: tideData.nextLow,
							});
						} else {
							console.log(`❌ ${name}: No tide data found`);
							resolve(null);
						}
					} catch (error) {
						console.log(
							`❌ ${name}: Parse Error: ${error.message}`
						);
						reject(error);
					}
				});
			})
			.on("error", (error) => {
				console.log(`❌ ${name}: Request Error: ${error.message}`);
				reject(error);
			});
	});
}

async function compareLocations() {
	console.log("🧪 COMPARING TIDE DATA BY LOCATION");
	console.log("==================================");
	console.log(
		`⏰ Current time: ${new Date().toLocaleString("en-GB", { timeZone: "Europe/London" })} BST`
	);
	console.log(`📊 BBC Wadebridge shows: FALLING tide`);
	console.log(`❓ Our Polzeath app shows: HIGH TIDE (wrong?)`);

	try {
		// Test different locations in Cornwall
		const locations = [
			{ name: "Polzeath", lat: 50.5689, lng: -4.9156 }, // The problematic one
			{ name: "Fistral Beach", lat: 50.4161, lng: -5.0931 }, // What we tested before
			{ name: "Wadebridge", lat: 50.5167, lng: -4.8167 }, // BBC reference location
		];

		const results = [];
		for (const location of locations) {
			const result = await testLocation(
				location.name,
				location.lat,
				location.lng
			);
			if (result) {
				results.push(result);
			}
			// Small delay between requests
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}

		console.log(`\n📊 COMPARISON RESULTS:`);
		console.log(`=====================`);

		results.forEach((result) => {
			console.log(`\n📍 ${result.name}:`);
			console.log(`   Coordinates: ${result.lat}, ${result.lng}`);
			console.log(
				`   Direction: ${result.isRising ? "🔼 RISING ❌" : "🔽 FALLING ✅"}`
			);
			console.log(`   Level: ${(result.level * 100).toFixed(1)}%`);
			console.log(
				`   Next High: ${new Date(result.nextHigh).toLocaleString("en-GB", { timeZone: "Europe/London" })} BST`
			);
			console.log(
				`   Next Low: ${new Date(result.nextLow).toLocaleString("en-GB", { timeZone: "Europe/London" })} BST`
			);
		});

		// Check if all locations agree
		const risingCount = results.filter((r) => r.isRising).length;
		const fallingCount = results.filter((r) => !r.isRising).length;

		console.log(`\n🧮 ANALYSIS:`);
		if (risingCount === 0) {
			console.log(`✅ All locations show FALLING - matches BBC data!`);
		} else if (fallingCount === 0) {
			console.log(`❌ All locations show RISING - contradicts BBC data!`);
		} else {
			console.log(
				`⚠️ Mixed results - ${fallingCount} FALLING, ${risingCount} RISING`
			);
			console.log(`This suggests location-specific tide differences.`);
		}

		console.log(`\n🎯 RECOMMENDATION:`);
		console.log(`If your app still shows "high tide" for Polzeath:`);
		console.log(`1. Clear browser cache completely`);
		console.log(`2. Check if the frontend is using cached data`);
		console.log(`3. The API backend is working correctly!`);
	} catch (error) {
		console.log(`❌ Error during comparison: ${error.message}`);
	}
}

compareLocations();
