// Test UK Admiralty API for accurate tide data
const https = require("https");

console.log("🇬🇧 Testing UK Admiralty API...");

const apiKey =
	process.env.ADMIRALTY_API_KEY || "06332f59fe2b44b9b546be924f8df5f8";

// Test with Polzeath coordinates (Cornish coast)
const lat = 50.5689;
const lng = -4.9156;

console.log(`Testing coordinates: ${lat}, ${lng} (Polzeath area)`);

// First, let's find the nearest tidal station
const stationsUrl = `https://admiraltyapi.azure-api.net/uktidalapi/api/V1/Stations`;

const options = {
	headers: {
		"Ocp-Apim-Subscription-Key": apiKey,
		"Content-Type": "application/json",
	},
};

console.log("\n🔍 Step 1: Finding nearest tidal stations...");

https
	.get(stationsUrl, options, (res) => {
		let data = "";
		res.on("data", (chunk) => (data += chunk));
		res.on("end", () => {
			try {
				const stations = JSON.parse(data);
				console.log(
					`Found ${stations.features ? stations.features.length : "unknown"} stations`
				);

				if (stations.features && stations.features.length > 0) {
					// Find closest station to our coordinates
					let closestStation = null;
					let minDistance = Infinity;

					stations.features.forEach((station) => {
						if (station.geometry && station.geometry.coordinates) {
							const stationLng = station.geometry.coordinates[0];
							const stationLat = station.geometry.coordinates[1];

							// Simple distance calculation
							const distance = Math.sqrt(
								Math.pow(stationLat - lat, 2) +
									Math.pow(stationLng - lng, 2)
							);

							if (distance < minDistance) {
								minDistance = distance;
								closestStation = station;
							}
						}
					});

					if (closestStation) {
						console.log(
							`\n📍 Closest station: ${closestStation.properties.Name}`
						);
						console.log(`   ID: ${closestStation.properties.Id}`);
						console.log(
							`   Distance: ~${(minDistance * 111).toFixed(1)}km`
						);
						console.log(
							`   Coordinates: [${closestStation.geometry.coordinates[1]}, ${closestStation.geometry.coordinates[0]}]`
						);

						// Now get tide data for this station
						const stationId = closestStation.properties.Id;
						const today = new Date().toISOString().split("T")[0];

						const tideUrl = `https://admiraltyapi.azure-api.net/uktidalapi/api/V1/Stations/${stationId}/TidalEvents?StartDate=${today}&EndDate=${today}`;

						console.log("\n🌊 Step 2: Getting tide times...");

						https
							.get(tideUrl, options, (tideRes) => {
								let tideData = "";
								tideRes.on(
									"data",
									(chunk) => (tideData += chunk)
								);
								tideRes.on("end", () => {
									try {
										const tideEvents = JSON.parse(tideData);
										console.log("\n📊 Today's tide times:");
										console.log("====================");

										if (
											tideEvents &&
											tideEvents.length > 0
										) {
											tideEvents.forEach((event, i) => {
												const time = new Date(
													event.DateTime
												);
												const type =
													event.EventType ===
													"HighWater"
														? "HIGH"
														: "LOW";
												const height = event.Height
													? `${event.Height.toFixed(2)}m`
													: "N/A";
												console.log(
													`${i + 1}. ${type} tide: ${time.toLocaleString("en-GB")} - ${height}`
												);
											});

											// Compare with current time
											const now = new Date();
											console.log(
												`\n🕐 Current time: ${now.toLocaleString("en-GB")}`
											);

											const nextTide = tideEvents.find(
												(event) =>
													new Date(event.DateTime) >
													now
											);
											if (nextTide) {
												const timeToNext =
													(new Date(
														nextTide.DateTime
													) -
														now) /
													(1000 * 60 * 60);
												const type =
													nextTide.EventType ===
													"HighWater"
														? "HIGH"
														: "LOW";
												console.log(
													`⏰ Next tide: ${type} in ${timeToNext.toFixed(1)} hours`
												);
											}
										} else {
											console.log(
												"❌ No tide events found for today"
											);
										}
									} catch (e) {
										console.log(
											"❌ Parse error for tide data:",
											e.message
										);
										console.log("Raw response:", tideData);
									}
								});
							})
							.on("error", (e) => {
								console.error(
									"❌ Error fetching tide data:",
									e.message
								);
							});
					} else {
						console.log("❌ No suitable station found");
					}
				} else {
					console.log("❌ No stations data received");
					console.log("Response:", data);
				}
			} catch (e) {
				console.log("❌ Parse error:", e.message);
				console.log("Raw response:", data);
			}
		});
	})
	.on("error", (e) => {
		console.error("❌ API Error:", e.message);
	});
