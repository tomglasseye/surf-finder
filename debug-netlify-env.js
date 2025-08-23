// Debug script to test Netlify environment variables
exports.handler = async (event, context) => {
	const headers = {
		"Access-Control-Allow-Origin": "*",
		"Content-Type": "application/json",
	};

	try {
		const admiraltyApiKey = process.env.ADMIRALTY_API_KEY;

		console.log("🔍 Debugging Netlify Environment:");
		console.log(`📊 Total env vars: ${Object.keys(process.env).length}`);
		console.log(
			`🔑 ADMIRALTY_API_KEY present: ${admiraltyApiKey ? "YES" : "NO"}`
		);

		if (admiraltyApiKey) {
			console.log(`📏 API key length: ${admiraltyApiKey.length}`);
			console.log(
				`🔒 API key preview: ${admiraltyApiKey.substring(0, 8)}...${admiraltyApiKey.substring(admiraltyApiKey.length - 4)}`
			);

			// Test API call
			try {
				console.log("🧪 Testing Admiralty API call...");
				const response = await fetch(
					"https://admiraltyapi.azure-api.net/uktidalapi/api/V1/Stations",
					{
						headers: {
							"Ocp-Apim-Subscription-Key": admiraltyApiKey,
							"Content-Type": "application/json",
						},
					}
				);

				console.log(`📡 Response status: ${response.status}`);
				console.log(
					`📡 Response headers: ${JSON.stringify([...response.headers.entries()])}`
				);

				if (response.ok) {
					const data = await response.json();
					console.log(
						`✅ API SUCCESS: ${data.features?.length || 0} stations`
					);

					return {
						statusCode: 200,
						headers,
						body: JSON.stringify({
							success: true,
							envVarPresent: true,
							apiKeyLength: admiraltyApiKey.length,
							stationsCount: data.features?.length || 0,
							message: "Admiralty API is working correctly!",
							timestamp: new Date().toISOString(),
						}),
					};
				} else {
					const errorText = await response.text();
					console.log(`❌ API Error: ${errorText}`);

					return {
						statusCode: 200,
						headers,
						body: JSON.stringify({
							success: false,
							envVarPresent: true,
							apiKeyLength: admiraltyApiKey.length,
							apiError: errorText,
							statusCode: response.status,
							message: "API key found but API call failed",
							timestamp: new Date().toISOString(),
						}),
					};
				}
			} catch (apiError) {
				console.log(`❌ API Network Error: ${apiError.message}`);

				return {
					statusCode: 200,
					headers,
					body: JSON.stringify({
						success: false,
						envVarPresent: true,
						apiKeyLength: admiraltyApiKey.length,
						networkError: apiError.message,
						message: "API key found but network error occurred",
						timestamp: new Date().toISOString(),
					}),
				};
			}
		} else {
			console.log("❌ No ADMIRALTY_API_KEY environment variable found");
			console.log(
				`🔍 Available env vars with 'API': ${Object.keys(process.env)
					.filter((k) => k.includes("API"))
					.join(", ")}`
			);
			console.log(
				`🔍 Available env vars with 'ADMIRALTY': ${Object.keys(
					process.env
				)
					.filter((k) => k.includes("ADMIRALTY"))
					.join(", ")}`
			);

			return {
				statusCode: 200,
				headers,
				body: JSON.stringify({
					success: false,
					envVarPresent: false,
					totalEnvVars: Object.keys(process.env).length,
					apiRelatedVars: Object.keys(process.env).filter((k) =>
						k.includes("API")
					),
					admiraltyVars: Object.keys(process.env).filter((k) =>
						k.includes("ADMIRALTY")
					),
					message: "ADMIRALTY_API_KEY environment variable not found",
					timestamp: new Date().toISOString(),
				}),
			};
		}
	} catch (error) {
		console.error("🚨 Debug function error:", error);

		return {
			statusCode: 500,
			headers,
			body: JSON.stringify({
				success: false,
				error: error.message,
				stack: error.stack,
				message: "Debug function crashed",
				timestamp: new Date().toISOString(),
			}),
		};
	}
};
