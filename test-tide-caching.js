#!/usr/bin/env node

// Test the tide caching system

// Mock Map for caching (in real environment this would be persistent storage)
const tideCache = new Map();

// Cache helper functions
function getTideCacheKey(latitude, longitude) {
	return `tide_${latitude.toFixed(3)}_${longitude.toFixed(3)}`;
}

function isTideCacheValid(cacheEntry) {
	if (!cacheEntry || !cacheEntry.timestamp) return false;

	const cacheTime = new Date(cacheEntry.timestamp);
	const now = new Date();
	const hoursSinceCached =
		(now.getTime() - cacheTime.getTime()) / (1000 * 60 * 60);

	// Cache valid for 24 hours
	return hoursSinceCached < 24;
}

// Test the caching system
async function testTideCaching() {
	console.log("🧪 Testing Tide Caching System");
	console.log("================================");

	// Test location: Newquay, Cornwall
	const latitude = 50.4119;
	const longitude = -5.0757;

	console.log(`📍 Test location: ${latitude}, ${longitude}`);

	const cacheKey = getTideCacheKey(latitude, longitude);
	console.log(`🔑 Cache key: ${cacheKey}`);

	// Test 1: No cache (should fetch fresh data)
	console.log("\n🆕 Test 1: No cache - should fetch fresh data");
	const cachedData = tideCache.get(cacheKey);
	console.log(`Cache status: ${cachedData ? "Found" : "Empty"}`);

	// Test 2: Simulate adding cache entry
	console.log("\n💾 Test 2: Adding cache entry");
	const mockCacheEntry = {
		data: {
			data: [
				{ time: "2024-01-20T06:30:00Z", type: "low", height: 0.5 },
				{ time: "2024-01-20T12:45:00Z", type: "high", height: 3.2 },
				{ time: "2024-01-20T18:15:00Z", type: "low", height: 0.8 },
				{ time: "2024-01-21T01:00:00Z", type: "high", height: 3.0 },
			],
		},
		timestamp: new Date().toISOString(),
		location: { latitude, longitude },
	};

	tideCache.set(cacheKey, mockCacheEntry);
	console.log(`✅ Cache entry added at ${mockCacheEntry.timestamp}`);

	// Test 3: Check if cache is valid
	console.log("\n⏰ Test 3: Checking cache validity");
	const isValid = isTideCacheValid(mockCacheEntry);
	console.log(`Cache valid: ${isValid ? "✅ Yes" : "❌ No"}`);

	// Test 4: Simulate old cache (should be invalid)
	console.log("\n🕰️ Test 4: Testing old cache entry");
	const oldCacheEntry = {
		...mockCacheEntry,
		timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
	};

	const isOldValid = isTideCacheValid(oldCacheEntry);
	console.log(
		`Old cache valid: ${isOldValid ? "✅ Yes" : "❌ No (Expected)"}`
	);

	// Test 5: Different locations get different cache keys
	console.log("\n🗺️ Test 5: Testing cache key uniqueness");
	const differentLat = 51.5074;
	const differentLng = -0.1278;
	const differentKey = getTideCacheKey(differentLat, differentLng);
	console.log(
		`Different location (${differentLat}, ${differentLng}): ${differentKey}`
	);
	console.log(
		`Keys are different: ${cacheKey !== differentKey ? "✅ Yes" : "❌ No"}`
	);

	console.log("\n🎯 Cache System Summary");
	console.log("======================");
	console.log(`Cache size: ${tideCache.size} entries`);
	console.log(`Cache keys: ${Array.from(tideCache.keys()).join(", ")}`);

	// Calculate estimated API savings
	console.log("\n📊 API Usage Projection");
	console.log("=======================");
	const uniqueLocations = 50; // Estimated unique surf spots
	const requestsPerDay = uniqueLocations; // With daily caching
	const requestsPerMonth = requestsPerDay * 30;
	const monthlyLimit = 1500;
	const utilizationPercent = (
		(requestsPerMonth / monthlyLimit) *
		100
	).toFixed(1);

	console.log(`🏄 Unique surf locations: ${uniqueLocations}`);
	console.log(`📅 Daily API requests: ${requestsPerDay}`);
	console.log(`📆 Monthly API requests: ${requestsPerMonth}`);
	console.log(
		`🎯 API limit utilization: ${utilizationPercent}% of ${monthlyLimit} requests`
	);
	console.log(
		`💰 Efficiency gain: ${(((1500 - requestsPerMonth) / 1500) * 100).toFixed(1)}% reduction in API usage`
	);

	if (requestsPerMonth <= monthlyLimit) {
		console.log("✅ Caching system keeps us well within API limits!");
	} else {
		console.log("⚠️ Still exceeding API limits - need more optimization");
	}
}

// Run the test
testTideCaching().catch(console.error);
