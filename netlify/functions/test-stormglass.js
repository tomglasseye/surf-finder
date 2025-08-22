// Test StormGlass.io API
exports.handler = async (event, context) => {
	const headers = {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Headers": "Content-Type",
		"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
		"Content-Type": "application/json",
	};

	if (event.httpMethod === "OPTIONS") {
		return { statusCode: 200, headers };
	}

	try {
		console.log("🧪 Testing StormGlass API...");

		const stormGlassApiKey = process.env.STORMGLASS_API_KEY;
		console.log(
			"API Key available:",
			stormGlassApiKey ? "✅ YES" : "❌ NO"
		);

		if (!stormGlassApiKey) {
			return {
				statusCode: 200,
				headers,
				body: JSON.stringify({
					status: "error",
					message: "STORMGLASS_API_KEY environment variable not set",
					suggestion:
						"Add your StormGlass API key to environment variables",
				}),
			};
		}

		// Test with Fistral Beach coordinates
		const latitude = 50.4161;
		const longitude = -5.0931;

		const now = new Date();
		const future = new Date(now.getTime() + 48 * 3600000);

		const startTime = now.toISOString();
		const endTime = future.toISOString();

		// StormGlass API endpoint for tide extremes
		const stormGlassUrl = `https://api.stormglass.io/v2/tide/extremes/point?lat=${latitude}&lng=${longitude}&start=${startTime}&end=${endTime}`;

		console.log("Making API request to StormGlass...");
		console.log("URL:", stormGlassUrl);

		const response = await fetch(stormGlassUrl, {
			headers: {
				Authorization: stormGlassApiKey,
			},
		});

		console.log("Response status:", response.status);
		console.log(
			"Response headers:",
			Object.fromEntries(response.headers.entries())
		);

		if (response.ok) {
			const data = await response.json();
			console.log("✅ StormGlass API Success!");

			const tidesCount = data.data ? data.data.length : 0;
			console.log("Tide extremes count:", tidesCount);

			// Sample tide extremes
			const sampleTides = data.data ? data.data.slice(0, 5) : [];

			return {
				statusCode: 200,
				headers,
				body: JSON.stringify({
					status: "success",
					message: `StormGlass API working! Found ${tidesCount} tide extremes`,
					apiResponse: {
						location: { latitude, longitude },
						timeRange: { start: startTime, end: endTime },
						tidesCount: tidesCount,
						sampleTides: sampleTides.map((tide) => ({
							time: tide.time,
							type: tide.type,
							height: tide.height,
						})),
						fullResponse: data,
					},
				}),
			};
		} else {
			const errorText = await response.text();
			console.log("❌ StormGlass API Error:", response.status, errorText);

			let errorMessage = "Unknown error";
			let suggestion = "Check API documentation";

			if (response.status === 401) {
				errorMessage = "Invalid API key";
				suggestion = "Verify your STORMGLASS_API_KEY is correct";
			} else if (response.status === 429) {
				errorMessage = "Rate limit exceeded";
				suggestion =
					"You've used your daily 50 requests. Try again tomorrow.";
			} else if (response.status === 422) {
				errorMessage = "Invalid request parameters";
				suggestion = "Check latitude, longitude, and time format";
			}

			return {
				statusCode: 200,
				headers,
				body: JSON.stringify({
					status: "api_error",
					message: `StormGlass API returned ${response.status}: ${errorMessage}`,
					error: errorText,
					suggestion: suggestion,
				}),
			};
		}
	} catch (error) {
		console.error("❌ Function error:", error);
		return {
			statusCode: 200,
			headers,
			body: JSON.stringify({
				status: "function_error",
				message: "Error testing StormGlass API",
				error: error.message,
				stack: error.stack,
			}),
		};
	}
};
