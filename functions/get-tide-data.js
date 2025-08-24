export async function handler(event, context) {
	// Set CORS headers
	const headers = {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Headers": "Content-Type",
		"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
		"Content-Type": "application/json",
	};

	// Handle preflight requests
	if (event.httpMethod === "OPTIONS") {
		return {
			statusCode: 200,
			headers,
			body: "",
		};
	}

	try {
		const {
			lat,
			lng,
			startDate: startDateParam,
			endDate: endDateParam,
		} = event.queryStringParameters || {};

		if (!lat || !lng) {
			return {
				statusCode: 400,
				headers,
				body: JSON.stringify({
					error: "Missing required parameters: lat, lng",
					source: "error",
				}),
			};
		}

		const latitude = parseFloat(lat);
		const longitude = parseFloat(lng);

		// Parse dates
		let startDate, endDate;
		if (startDateParam) {
			startDate = new Date(startDateParam);
		} else {
			startDate = new Date();
			startDate.setHours(0, 0, 0, 0);
		}

		if (endDateParam) {
			endDate = new Date(endDateParam);
		} else {
			endDate = new Date(startDate);
			endDate.setDate(startDate.getDate() + 1);
		}

		console.log(
			`🌊 Tide data request: ${latitude}, ${longitude} from ${startDate.toISOString()} to ${endDate.toISOString()}`
		);

		// Try UK Admiralty API
		const admiraltyApiKey = process.env.ADMIRALTY_API_KEY;

		if (admiraltyApiKey) {
			try {
				console.log("🏴󠁧󠁢󠁥󠁮󠁧󠁿 Using UK Admiralty API for tide data");

				const admiraltyUrl = new URL(
					"https://admiraltyapi.azure-api.net/uktidalapi/api/V1/Stations/NearestStation"
				);
				admiraltyUrl.searchParams.set(
					"longitude",
					longitude.toString()
				);
				admiraltyUrl.searchParams.set("latitude", latitude.toString());
				admiraltyUrl.searchParams.set("radius", "50");

				const stationResponse = await fetch(admiraltyUrl.toString(), {
					headers: {
						"Ocp-Apim-Subscription-Key": admiraltyApiKey,
					},
				});

				if (!stationResponse.ok) {
					throw new Error(
						`Station lookup failed: ${stationResponse.status}`
					);
				}

				const stationData = await stationResponse.json();
				console.log(`🏴󠁧󠁢󠁥󠁮󠁧󠁿 Found station:`, stationData);

				if (
					!stationData.features ||
					stationData.features.length === 0
				) {
					throw new Error("No tide stations found near location");
				}

				const station = stationData.features[0];
				const stationId = station.properties.Id;

				// Get tide events
				const eventsUrl = new URL(
					"https://admiraltyapi.azure-api.net/uktidalapi/api/V1/Stations/TidalEvents"
				);
				eventsUrl.searchParams.set("stationId", stationId);
				eventsUrl.searchParams.set("duration", "7");

				const eventsResponse = await fetch(eventsUrl.toString(), {
					headers: {
						"Ocp-Apim-Subscription-Key": admiraltyApiKey,
					},
				});

				if (!eventsResponse.ok) {
					throw new Error(
						`Events fetch failed: ${eventsResponse.status}`
					);
				}

				const eventsData = await eventsResponse.json();
				console.log(`🌊 Raw events data:`, eventsData);

				// Process tide events
				const tideEvents = [];

				if (eventsData && Array.isArray(eventsData)) {
					for (const event of eventsData) {
						const eventDate = new Date(event.DateTime);

						// Filter events within our date range
						if (eventDate >= startDate && eventDate <= endDate) {
							tideEvents.push({
								time: event.DateTime,
								type:
									event.EventType?.toLowerCase() ===
									"highwater"
										? "high"
										: "low",
								height: parseFloat(event.Height || 0),
							});
						}
					}
				}

				console.log(
					`✅ Processed ${tideEvents.length} tide events for date range`
				);

				return {
					statusCode: 200,
					headers,
					body: JSON.stringify({
						tideEvents,
						station: {
							id: stationId,
							name: station.properties.Name,
							distance: station.properties.Distance,
						},
						source: "admiralty_uk",
						timestamp: new Date().toISOString(),
						dateRange: {
							start: startDate.toISOString(),
							end: endDate.toISOString(),
						},
					}),
				};
			} catch (admiraltyError) {
				console.warn("⚠️ UK Admiralty API failed:", admiraltyError);
			}
		} else {
			console.log("⚠️ No UK Admiralty API key available");
		}

		// Fallback to enhanced calculation
		console.log("🔄 Using enhanced calculation fallback");

		const tideEvents = [];
		let currentTime = new Date(startDate);
		const endTime = new Date(endDate);

		// Generate approximate tide times (2 highs, 2 lows per day)
		while (currentTime < endTime) {
			const dayStart = new Date(currentTime);
			dayStart.setHours(0, 0, 0, 0);

			// Approximate tide times for UK waters
			const baseHighTime1 = 6 * 60; // 6:00 AM in minutes
			const baseHighTime2 = 18 * 60; // 6:00 PM in minutes
			const baseLowTime1 = 0 * 60; // 12:00 AM in minutes
			const baseLowTime2 = 12 * 60; // 12:00 PM in minutes

			// Add some variation based on coordinates (rough approximation)
			const variation = Math.sin((latitude * Math.PI) / 180) * 60; // ±60 minutes based on latitude

			const times = [
				{ type: "low", minutes: baseLowTime1 + variation, height: 1.2 },
				{
					type: "high",
					minutes: baseHighTime1 + variation,
					height: 4.8,
				},
				{ type: "low", minutes: baseLowTime2 + variation, height: 1.5 },
				{
					type: "high",
					minutes: baseHighTime2 + variation,
					height: 4.5,
				},
			];

			times.forEach((tide) => {
				const tideTime = new Date(dayStart);
				tideTime.setMinutes(tide.minutes);

				// More lenient filtering - include events that are within the date range
				// Use date comparison instead of strict time comparison
				const tideDate = new Date(tideTime);
				tideDate.setHours(0, 0, 0, 0);
				const startDateOnly = new Date(startDate);
				startDateOnly.setHours(0, 0, 0, 0);
				const endDateOnly = new Date(endDate);
				endDateOnly.setHours(0, 0, 0, 0);

				if (tideDate >= startDateOnly && tideDate < endDateOnly) {
					tideEvents.push({
						time: tideTime.toISOString(),
						type: tide.type,
						height: tide.height + (Math.random() - 0.5) * 0.5, // Add small random variation
					});
				}
			});

			currentTime.setDate(currentTime.getDate() + 1);
		}

		console.log(
			`📊 Generated ${tideEvents.length} enhanced calculation events`
		);

		return {
			statusCode: 200,
			headers,
			body: JSON.stringify({
				tideEvents,
				source: "enhanced_calculation",
				timestamp: new Date().toISOString(),
				dateRange: {
					start: startDate.toISOString(),
					end: endDate.toISOString(),
				},
			}),
		};
	} catch (error) {
		console.error("❌ Tide data error:", error);

		return {
			statusCode: 500,
			headers,
			body: JSON.stringify({
				error: "Failed to fetch tide data",
				details: error.message,
				source: "error",
			}),
		};
	}
}
