#!/usr/bin/env node

// Test the actual Netlify function
import { handler } from "./netlify/functions/get-forecast.js";

// Mock environment with your API key
process.env.STORMGLASS_API_KEY =
	"cce74f04-1cbe-11ee-86b2-0242ac130002-cce74f90-1cbe-11ee-86b2-0242ac130002";

async function testNetlifyFunction() {
	console.log("🧪 Testing Netlify Function with Fixed API Key");
	console.log("===============================================");

	// Mock event for Fistral Beach
	const mockEvent = {
		queryStringParameters: {
			lat: "50.4119",
			lng: "-5.0757",
			spotName: "fistral-beach",
		},
	};

	const mockContext = {};

	console.log("📍 Testing: Fistral Beach, Newquay");
	console.log("🔑 Using: STORMGLASS_API_KEY");

	try {
		console.log("\n🔄 Calling get-forecast function...");

		const result = await handler(mockEvent, mockContext);

		console.log(`📡 Status: ${result.statusCode}`);

		if (result.statusCode === 200) {
			const data = JSON.parse(result.body);

			console.log("✅ Function Success!");

			if (data.tideData) {
				console.log("\n🌊 Tide Data Found:");
				console.log(
					`   Level: ${(data.tideData.currentLevel * 100).toFixed(1)}%`
				);
				console.log(
					`   Direction: ${data.tideData.isRising ? "🔼 RISING" : "🔽 FALLING"}`
				);
				console.log(`   Source: ${data.tideData.source}`);
				console.log(
					`   Next High: ${new Date(data.tideData.nextHigh).toLocaleString("en-GB", { timeZone: "Europe/London" })} BST`
				);
				console.log(
					`   Next Low: ${new Date(data.tideData.nextLow).toLocaleString("en-GB", { timeZone: "Europe/London" })} BST`
				);

				// Verify this matches our expectation
				if (data.tideData.source === "stormglass") {
					console.log(
						"\n🎉 SUCCESS: Using real StormGlass API data!"
					);
					console.log(
						"✅ This should now show correct tide direction"
					);
				} else if (data.tideData.source === "enhanced_calculation") {
					console.log(
						"\n⚠️ WARNING: Still using fallback calculation"
					);
					console.log("🔍 API might not be working or key issue");
				}
			} else {
				console.log("❌ No tide data in response");
			}
		} else {
			console.log("❌ Function failed:");
			console.log(result.body);
		}
	} catch (error) {
		console.log(`💥 Function error: ${error.message}`);
		console.log(error);
	}
}

testNetlifyFunction().catch(console.error);
