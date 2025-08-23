// Quick test of the API key
const API_KEY = "06332f59fe2b44b9b546be924f8df5f8";

fetch("https://admiraltyapi.azure-api.net/uktidalapi/api/V1/Stations", {
	headers: {
		"Ocp-Apim-Subscription-Key": API_KEY,
		"Content-Type": "application/json",
	},
})
	.then((response) => {
		console.log(`Status: ${response.status}`);
		if (response.ok) {
			return response.json();
		} else {
			return response.text().then((text) => {
				throw new Error(`API Error ${response.status}: ${text}`);
			});
		}
	})
	.then((data) => {
		console.log(`✅ SUCCESS: ${data.features?.length || 0} stations`);
		console.log("🚀 Your API key is working perfectly!");
		console.log(
			"🔧 The issue is definitely with the Netlify environment variable."
		);
	})
	.catch((error) => {
		console.log(`❌ ERROR: ${error.message}`);
	});
