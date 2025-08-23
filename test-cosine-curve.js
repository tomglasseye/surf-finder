#!/usr/bin/env node

// Test tide direction at different points in the cycle

console.log("🔍 COMPREHENSIVE TIDE DIRECTION TEST");
console.log("====================================");

function testTideDirectionAtPoint(
	beforeExtreme,
	afterExtreme,
	currentTimeStr,
	label
) {
	console.log(`\n📊 ${label}`);

	const beforeTime = new Date(beforeExtreme.time).getTime();
	const afterTime = new Date(afterExtreme.time).getTime();
	const targetTime = new Date(currentTimeStr).getTime();
	const progress = (targetTime - beforeTime) / (afterTime - beforeTime);

	// OLD LOGIC (simple comparison)
	const oldDirection =
		afterExtreme.height > beforeExtreme.height ? "RISING" : "FALLING";

	// NEW LOGIC (derivative-based)
	const cosineDerivative =
		(Math.sin(progress * Math.PI) *
			Math.PI *
			(afterExtreme.height - beforeExtreme.height)) /
		(afterTime - beforeTime);
	const newDirection = cosineDerivative > 0 ? "RISING" : "FALLING";

	// Current height
	const smoothProgress = (1 - Math.cos(progress * Math.PI)) / 2;
	const currentHeight =
		beforeExtreme.height +
		(afterExtreme.height - beforeExtreme.height) * smoothProgress;

	console.log(
		`   ${beforeExtreme.type.toUpperCase()}: ${beforeExtreme.time} - ${beforeExtreme.height}m`
	);
	console.log(
		`   Current: ${currentTimeStr} - ${currentHeight.toFixed(2)}m (${(progress * 100).toFixed(1)}% through cycle)`
	);
	console.log(
		`   ${afterExtreme.type.toUpperCase()}: ${afterExtreme.time} - ${afterExtreme.height}m`
	);
	console.log(
		`   OLD: ${oldDirection} | NEW: ${newDirection} | Derivative: ${cosineDerivative.toFixed(6)}`
	);

	return {
		oldDirection,
		newDirection,
		different: oldDirection !== newDirection,
	};
}

// Test LOW to HIGH cycle
const lowTide = { time: "2025-08-22T06:00:00Z", height: 0.5, type: "low" };
const highTide = { time: "2025-08-22T12:00:00Z", height: 2.0, type: "high" };

testTideDirectionAtPoint(
	lowTide,
	highTide,
	"2025-08-22T07:00:00Z",
	"1 hour after LOW (early rising)"
);
testTideDirectionAtPoint(
	lowTide,
	highTide,
	"2025-08-22T09:00:00Z",
	"3 hours after LOW (mid rising)"
);
testTideDirectionAtPoint(
	lowTide,
	highTide,
	"2025-08-22T11:00:00Z",
	"5 hours after LOW (late rising)"
);

// Test HIGH to LOW cycle
const highTide2 = { time: "2025-08-22T12:00:00Z", height: 2.0, type: "high" };
const lowTide2 = { time: "2025-08-22T18:00:00Z", height: 0.5, type: "low" };

testTideDirectionAtPoint(
	highTide2,
	lowTide2,
	"2025-08-22T13:00:00Z",
	"1 hour after HIGH (early falling)"
);
testTideDirectionAtPoint(
	highTide2,
	lowTide2,
	"2025-08-22T15:00:00Z",
	"3 hours after HIGH (mid falling)"
);
testTideDirectionAtPoint(
	highTide2,
	lowTide2,
	"2025-08-22T17:00:00Z",
	"5 hours after HIGH (late falling)"
);

console.log("\n🤔 POTENTIAL ISSUE FOUND:");
console.log("The cosine interpolation might not be correctly implemented.");
console.log("Let me test the math more carefully...");

// Test the cosine curve manually
console.log("\n📈 COSINE CURVE ANALYSIS:");
for (let progress = 0; progress <= 1; progress += 0.25) {
	const smoothProgress = (1 - Math.cos(progress * Math.PI)) / 2;
	const derivative = Math.sin(progress * Math.PI) * Math.PI;
	const direction =
		derivative > 0 ? "RISING" : derivative < 0 ? "FALLING" : "PEAK/TROUGH";

	console.log(
		`Progress: ${(progress * 100).toFixed(0).padStart(3)}% | Height: ${smoothProgress.toFixed(3)} | Derivative: ${derivative.toFixed(3)} | Direction: ${direction}`
	);
}

console.log("\n🚨 DISCOVERED THE ISSUE!");
console.log("The cosine interpolation (1 - cos(x))/2 creates a curve that:");
console.log("- Starts at 0 (minimum)");
console.log("- Rises to 1 (maximum)");
console.log("- This means it ALWAYS goes from low to high!");
console.log("");
console.log("But real tides can go HIGH → LOW or LOW → HIGH");
console.log(
	"The interpolation should account for which direction we're going!"
);

console.log("\n💡 SOLUTION:");
console.log("Need to flip the cosine curve when going from HIGH to LOW");
console.log("So HIGH→LOW uses: (1 + cos(x))/2 (inverted curve)");
