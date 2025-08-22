// Debug script to test tide data APIs and check current implementation

console.log("=== Tide Data Debug ===\n");

const lat = 50.4161; // Fistral Beach
const lng = -5.0931;

console.log(`Testing for location: ${lat}, ${lng} (Fistral Beach, Cornwall)\n`);

// 1. Check current Admiralty API URL format
console.log("1. Current Admiralty API URL:");
const admiraltyUrl = `https://admiraltyapi.portal.azure-api.net/ukho/tides/api/V1/Stations/${lat}/${lng}/TidalPredictions`;
console.log(admiraltyUrl);
console.log(
	"Issue: This URL format looks incorrect - Admiralty API typically uses station IDs, not lat/lng\n"
);

// 2. Correct Admiralty API format (if available)
console.log("2. Correct Admiralty API should be:");
console.log(
	"https://admiraltyapi.portal.azure-api.net/ukho/tides/api/V1/Stations/{stationId}/TidalPredictions"
);
console.log(
	'Where stationId is a specific tide station ID (e.g., "0001" for Avonmouth)\n'
);

// 3. Free alternatives
console.log("3. Free UK Tide Data Alternatives:");
console.log("a) WorldTides.info (100 free requests/month):");
console.log(
	`   https://www.worldtides.info/api/v3?heights&lat=${lat}&lon=${lng}&key=YOUR_KEY`
);
console.log("b) StormGlass.io (free tier):");
console.log(
	`   https://api.stormglass.io/v2/tide/extremes/point?lat=${lat}&lng=${lng}`
);
console.log("c) Tidal API:");
console.log(`   https://tidal-api.org/api/tides?lat=${lat}&lng=${lng}\n`);

// 4. Test current fallback calculation
console.log("4. Testing current fallback calculation:");
const currentTime = new Date();
console.log(`Current time: ${currentTime.toISOString()}`);

const lunarCycleMs = 12.42 * 60 * 60 * 1000; // ~12.42 hours between high tides
console.log(`Lunar cycle: ${lunarCycleMs}ms (${lunarCycleMs / 3600000} hours)`);

// Cornwall location offset
const locationOffset = -1.5 * 3600000; // 1.5 hours earlier for Cornwall
console.log(`Cornwall offset: ${locationOffset / 3600000} hours`);

const adjustedTime = currentTime.getTime() + locationOffset;
const seedTime = Math.floor(adjustedTime / lunarCycleMs);
console.log(`Seed time: ${seedTime}`);

const tideHigh1 = new Date(seedTime * lunarCycleMs - locationOffset);
const tideLow1 = new Date(tideHigh1.getTime() + lunarCycleMs / 2);
const tideHigh2 = new Date(tideHigh1.getTime() + lunarCycleMs);

console.log(`Calculated High 1: ${tideHigh1.toLocaleString()}`);
console.log(`Calculated Low 1: ${tideLow1.toLocaleString()}`);
console.log(`Calculated High 2: ${tideHigh2.toLocaleString()}`);

// Calculate current tide level
const timeSinceHigh =
	(currentTime.getTime() - tideHigh1.getTime()) % lunarCycleMs;
const tidePosition = Math.abs(
	Math.cos((timeSinceHigh / lunarCycleMs) * 2 * Math.PI)
);
console.log(
	`Current calculated tide level: ${Math.round(tidePosition * 100)}%\n`
);

console.log("5. Recommendations:");
console.log("- The Admiralty API URL format is incorrect");
console.log("- Consider switching to WorldTides.info or StormGlass.io");
console.log(
	"- Current mathematical fallback might be inaccurate for real tidal patterns"
);
console.log(
	"- For accurate UK tides, you need station-based data or a proper tidal API"
);
