#!/usr/bin/env node

// Test the actual Netlify function to see what it returns

import https from 'https';

function testNetlifyFunction() {
	console.log("🔍 Testing Live Netlify Function");
	console.log("=================================");
	
	// Test with a Cornwall location that should be falling
	const spotName = "Fistral Beach";
	const lat = 50.4119;
	const lng = -5.0757;
	
	const url = `https://surf-finder.netlify.app/.netlify/functions/get-forecast?spotName=${encodeURIComponent(spotName)}&lat=${lat}&lng=${lng}`;
	
	console.log(`📞 Calling: ${url}`);
	console.log(`⏰ Time: ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' })} BST`);
	console.log(`📍 Expected: FALLING tide (per BBC data)`);
	
	https.get(url, (res) => {
		let data = '';
		
		res.on('data', (chunk) => {
			data += chunk;
		});
		
		res.on('end', () => {
			try {
				const result = JSON.parse(data);
				console.log("\n📊 RESPONSE ANALYSIS:");
				console.log(`✅ Status: ${res.statusCode}`);
				
				if (result.error) {
					console.log(`❌ Error: ${result.error}`);
					return;
				}
				
				// Check tide data
				if (result.tideData) {
					console.log("\n🌊 TIDE DATA:");
					console.log(`📈 Direction: ${result.tideData.isRising ? '🔼 RISING ❌' : '🔽 FALLING ✅'}`);
					console.log(`📊 Level: ${(result.tideData.currentLevel * 100).toFixed(1)}%`);
					console.log(`📡 Source: ${result.tideData.source || 'unknown'}`);
					
					if (result.tideData.nextHigh) {
						console.log(`⏰ Next High: ${new Date(result.tideData.nextHigh).toLocaleString('en-GB', { timeZone: 'Europe/London' })} BST`);
					}
					if (result.tideData.nextLow) {
						console.log(`⏰ Next Low: ${new Date(result.tideData.nextLow).toLocaleString('en-GB', { timeZone: 'Europe/London' })} BST`);
					}
					
					// Analyze the source
					console.log("\n🔍 SOURCE ANALYSIS:");
					if (result.tideData.source === 'stormglass_api') {
						console.log("✅ Using StormGlass API - This is correct!");
					} else if (result.tideData.source === 'enhanced_calculation') {
						console.log("⚠️ Using enhanced calculation - API might not be working");
					} else {
						console.log("❓ Unknown source - might be using old calculation");
					}
					
					// Check for API key issues
					if (result.debug) {
						console.log("\n🐛 DEBUG INFO:");
						console.log(JSON.stringify(result.debug, null, 2));
					}
				} else {
					console.log("❌ No tide data in response");
				}
				
				console.log("\n📝 FULL RESPONSE:");
				console.log(JSON.stringify(result, null, 2));
				
			} catch (error) {
				console.log(`❌ Parse Error: ${error.message}`);
				console.log(`📄 Raw Response: ${data}`);
			}
		});
		
	}).on('error', (error) => {
		console.log(`❌ Request Error: ${error.message}`);
	});
}

// Run the test
testNetlifyFunction();
