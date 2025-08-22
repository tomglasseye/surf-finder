// Simple test function to verify WorldTides API access
// This simulates what happens in your Netlify function

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
		console.log("🧪 Testing WorldTides API...");

		// Test coordinates - Fistral Beach
		const latitude = 50.4161;
		const longitude = -5.0931;

		const worldTidesApiKey = process.env.ADMIRALTY_API_KEY; // Using your existing API key
		console.log(
			"API Key available:",
			worldTidesApiKey ? "✅ YES" : "❌ NO"
		);

		if (!worldTidesApiKey) {
			return {
				statusCode: 200,
				headers,
				body: JSON.stringify({
					status: "error",
					message: "ADMIRALTY_API_KEY environment variable not set",
					fallback: "Using enhanced calculation instead",
				}),
			};
		}

		// Get current time and next 24 hours
		const now = new Date();
		const tomorrow = new Date(now.getTime() + 24 * 3600000);

		const startTimestamp = Math.floor(now.getTime() / 1000);
		const endTimestamp = Math.floor(tomorrow.getTime() / 1000);

		// WorldTides API call
		const worldTidesUrl = `https://www.worldtides.info/api/v3?heights&extremes&lat=${latitude}&lon=${longitude}&start=${startTimestamp}&length=86400&key=${worldTidesApiKey}&format=json`;

		console.log("Making API request to WorldTides...");
		const response = await fetch(worldTidesUrl);

		console.log("Response status:", response.status);
		console.log(
			"Response headers:",
			Object.fromEntries(response.headers.entries())
		);

		if (response.ok) {
			const data = await response.json();
			console.log("✅ WorldTides API Success!");
			console.log("Response status:", data.status);
			console.log(
				"Heights count:",
				data.heights ? data.heights.length : 0
			);
			console.log(
				"Extremes count:",
				data.extremes ? data.extremes.length : 0
			);

			// Sample of first few data points
			const sampleHeights = data.heights ? data.heights.slice(0, 3) : [];
			const sampleExtremes = data.extremes
				? data.extremes.slice(0, 2)
				: [];

			return {
				statusCode: 200,
				headers,
				body: JSON.stringify({
					status: "success",
					message: "WorldTides API working correctly",
					apiResponse: {
						status: data.status,
						heightsCount: data.heights ? data.heights.length : 0,
						extremesCount: data.extremes ? data.extremes.length : 0,
						sampleHeights: sampleHeights,
						sampleExtremes: sampleExtremes,
						location: `${latitude}, ${longitude}`,
						timeRange: `${new Date(startTimestamp * 1000).toISOString()} to ${new Date(endTimestamp * 1000).toISOString()}`,
					},
				}),
			};
		} else {
			const errorText = await response.text();
			console.log("❌ WorldTides API Error:", response.status, errorText);

			return {
				statusCode: 200,
				headers,
				body: JSON.stringify({
					status: "api_error",
					message: `WorldTides API returned ${response.status}`,
					error: errorText,
					suggestion: "Check API key validity and request limits",
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
				message: "Error testing WorldTides API",
				error: error.message,
			}),
		};
	}
};
