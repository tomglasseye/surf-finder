import {
	ResponsiveContainer,
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ReferenceArea,
	ReferenceLine,
} from "recharts";

interface TideData {
	currentLevel: number;
	isRising: boolean;
	nextHigh: Date;
	nextLow: Date;
	source?: string;
	tideEvents?: Array<{
		time: string;
		type: "high" | "low";
		height: number;
	}>;
}

interface SimpleTideChartProps {
	tideData?: TideData | null;
	showHours?: number;
	height?: number;
	className?: string;
	latitude?: number;
	longitude?: number;
}

export default function SimpleTideChart({
	tideData,
	showHours = 24,
	height = 300,
	className = "",
	latitude = 50.4,
	longitude = -5.0,
}: SimpleTideChartProps) {
	// Calculate sunrise and sunset times
	const calculateSunTimes = (date: Date, lat = latitude, lng = longitude) => {
		const dayOfYear = Math.floor(
			(date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) /
				86400000
		);
		const p = Math.asin(
			0.39795 * Math.cos((0.98563 * (dayOfYear - 173) * Math.PI) / 180)
		);

		const argument = -Math.tan((lat * Math.PI) / 180) * Math.tan(p);
		const hourAngle = Math.acos(Math.max(-1, Math.min(1, argument)));

		const sunriseHour =
			12 - (4 * (longitude + (hourAngle * 180) / Math.PI)) / 60;
		const sunsetHour =
			12 - (4 * (longitude - (hourAngle * 180) / Math.PI)) / 60;

		return {
			sunrise: Math.max(0, Math.min(24, sunriseHour)),
			sunset: Math.max(0, Math.min(24, sunsetHour)),
		};
	};

	const generateSimpleTidePoints = () => {
		const now = new Date();
		const startOfDay = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
			0,
			0,
			0
		);
		const points = [];
		const sunTimes = calculateSunTimes(now);

		// Data generation constants
		const minuteInterval = 15; // Generate point every 15 minutes
		const totalMinutes = showHours * 60;

		// If we have tide events data (from any source), create a smooth curve based on the tide events
		if (tideData?.tideEvents && tideData.tideEvents.length > 0) {
			console.log(
				`🌊 Building smooth curve from ${tideData.source || "unknown"} tide data`
			);

			const events = tideData.tideEvents;

			// Normalize heights to 0-1 scale
			const heights = events.map((e) => e.height);
			const minHeight = Math.min(...heights);
			const maxHeight = Math.max(...heights);
			const heightRange = maxHeight - minHeight;

			// Create data points every 15 minutes for smoother curve and accurate current time
			for (
				let minute = 0;
				minute < totalMinutes;
				minute += minuteInterval
			) {
				const hour = minute / 60;
				const currentTime = new Date(
					startOfDay.getTime() + minute * 60000
				);
				const currentTimeMs = currentTime.getTime();

				// Find the tide events that bracket this time point
				let beforeEvent = null;
				let afterEvent = null;

				for (let i = 0; i < events.length; i++) {
					const eventTime = new Date(events[i].time).getTime();

					if (eventTime <= currentTimeMs) {
						beforeEvent = events[i];
					} else if (eventTime > currentTimeMs && !afterEvent) {
						afterEvent = events[i];
						break;
					}
				}

				let tideLevel = 0.5; // Default middle level
				let isHighTide = false;
				let isLowTide = false;

				if (beforeEvent && afterEvent) {
					// Interpolate between the two tide events using smooth cosine curve
					const beforeTime = new Date(beforeEvent.time).getTime();
					const afterTime = new Date(afterEvent.time).getTime();
					const progress =
						(currentTimeMs - beforeTime) / (afterTime - beforeTime);

					const beforeHeight = beforeEvent.height;
					const afterHeight = afterEvent.height;

					// Use cosine interpolation for smooth curves
					let smoothProgress;
					if (
						beforeEvent.type === "high" &&
						afterEvent.type === "low"
					) {
						// Falling tide: HIGH → LOW - use standard cosine curve (starts high, curves down)
						smoothProgress = (1 - Math.cos(progress * Math.PI)) / 2;
					} else if (
						beforeEvent.type === "low" &&
						afterEvent.type === "high"
					) {
						// Rising tide: LOW → HIGH - use inverted cosine curve (starts low, curves up)
						smoothProgress =
							(1 + Math.cos((1 - progress) * Math.PI)) / 2;
					} else {
						// Same type events - linear interpolation
						smoothProgress = progress;
					}

					const interpolatedHeight =
						beforeHeight +
						(afterHeight - beforeHeight) * smoothProgress;
					tideLevel =
						heightRange > 0
							? (interpolatedHeight - minHeight) / heightRange
							: 0.5;

					// Mark exact tide event times (within 30 minutes)
					for (const event of events) {
						const eventTime = new Date(event.time);
						const eventHourFloat =
							eventTime.getHours() + eventTime.getMinutes() / 60;

						if (Math.abs(eventHourFloat - hour) <= 0.5) {
							// Within 30 minutes
							isHighTide = event.type === "high";
							isLowTide = event.type === "low";
							break;
						}
					}
				} else if (beforeEvent) {
					// Only have previous event - extrapolate
					tideLevel =
						heightRange > 0
							? (beforeEvent.height - minHeight) / heightRange
							: 0.5;
				} else if (afterEvent) {
					// Only have future event - extrapolate
					tideLevel =
						heightRange > 0
							? (afterEvent.height - minHeight) / heightRange
							: 0.5;
				}

				// Ensure tide level is within bounds
				tideLevel = Math.max(0.05, Math.min(0.95, tideLevel));

				// Calculate realistic height in meters
				const tideHeightMeters = minHeight + tideLevel * heightRange;

				// Check if this is the exact current time (within 15 minutes)
				const currentHour = now.getHours() + now.getMinutes() / 60;
				const currentMinuteFloat =
					now.getHours() * 60 + now.getMinutes();
				const dataPointMinute = Math.floor(minute);
				const isCurrentTime =
					Math.abs(dataPointMinute - currentMinuteFloat) <
					minuteInterval;

				// Check if it's night time
				const isDaylight =
					hour >= sunTimes.sunrise && hour <= sunTimes.sunset;

				const hourPart = Math.floor(hour);
				const minutePart = minute % 60;

				points.push({
					hour,
					time: `${hourPart.toString().padStart(2, "0")}:${minutePart.toString().padStart(2, "0")}`,
					level: tideLevel,
					percentage: Math.round(tideLevel * 100),
					heightMeters: Number(tideHeightMeters.toFixed(1)),
					isHighTide,
					isLowTide,
					isNow: isCurrentTime,
					isDaylight,
					isSunrise: Math.abs(hour - sunTimes.sunrise) < 0.3, // More precise
					isSunset: Math.abs(hour - sunTimes.sunset) < 0.3, // More precise
				});
			}
		} else {
			// Fallback: create simple sine wave pattern
			console.log("📊 Using fallback sine wave pattern");
			const sunTimes = calculateSunTimes(now);

			for (
				let minute = 0;
				minute < totalMinutes;
				minute += minuteInterval
			) {
				const hour = minute / 60;
				// Simple 12-hour cycle
				const angle = (hour / 12.42) * 2 * Math.PI; // ~12.42 hour tidal cycle
				const level = 0.5 + 0.4 * Math.sin(angle);

				const currentMinuteFloat =
					now.getHours() * 60 + now.getMinutes();
				const dataPointMinute = Math.floor(minute);
				const isCurrentTime =
					Math.abs(dataPointMinute - currentMinuteFloat) <
					minuteInterval;
				const isDaylight =
					hour >= sunTimes.sunrise && hour <= sunTimes.sunset;

				const hourPart = Math.floor(hour);
				const minutePart = minute % 60;

				points.push({
					hour,
					time: `${hourPart.toString().padStart(2, "0")}:${minutePart.toString().padStart(2, "0")}`,
					level: Math.max(0.1, Math.min(0.9, level)),
					percentage: Math.round(level * 100),
					heightMeters: Number((2.0 + level * 3.0).toFixed(1)), // Estimated 2-5m range
					isHighTide: false,
					isLowTide: false,
					isNow: isCurrentTime,
					isDaylight,
					isSunrise: Math.abs(hour - sunTimes.sunrise) < 0.5,
					isSunset: Math.abs(hour - sunTimes.sunset) < 0.5,
				});
			}
		}

		return points;
	};

	// Generate unique markers based on actual curve peaks and troughs
	const generateUniqueMarkers = (points: any[]) => {
		const markers = [];
		const now = new Date();
		const currentHour = now.getHours() + now.getMinutes() / 60;

		// Find actual peaks (high tides) and troughs (low tides) in the curve
		const peaks: any[] = [];
		const troughs: any[] = [];

		// Check if we have explicit tide events marked in the data
		const explicitTideEvents = points.filter(
			(p) => p.isHighTide || p.isLowTide
		);

		if (explicitTideEvents.length > 0) {
			// Use explicit tide event markers from the data
			explicitTideEvents.forEach((point) => {
				if (point.isHighTide) peaks.push(point);
				if (point.isLowTide) troughs.push(point);
			});
		} else {
			// Fallback: detect peaks and troughs from the curve shape
			for (let i = 2; i < points.length - 2; i++) {
				const prev2 = points[i - 2];
				const prev = points[i - 1];
				const curr = points[i];
				const next = points[i + 1];
				const next2 = points[i + 2];

				// More robust peak detection: check if current is higher than 2 points on each side
				const isPeak =
					curr.level > prev2.level &&
					curr.level > prev.level &&
					curr.level > next.level &&
					curr.level > next2.level &&
					curr.level > 0.65; // Significant peak threshold

				// More robust trough detection
				const isTrough =
					curr.level < prev2.level &&
					curr.level < prev.level &&
					curr.level < next.level &&
					curr.level < next2.level &&
					curr.level < 0.35; // Significant trough threshold

				if (isPeak) {
					// Check if we already have a nearby peak (avoid duplicates)
					const nearbyPeak = peaks.find(
						(p) => Math.abs(p.hour - curr.hour) < 2
					);
					if (!nearbyPeak) {
						peaks.push(curr);
					}
				}

				if (isTrough) {
					// Check if we already have a nearby trough (avoid duplicates)
					const nearbyTrough = troughs.find(
						(t) => Math.abs(t.hour - curr.hour) < 2
					);
					if (!nearbyTrough) {
						troughs.push(curr);
					}
				}
			}
		}

		// Add high tide markers (limit to avoid too many)
		peaks.slice(0, 3).forEach((peak, index) => {
			markers.push(
				<ReferenceLine
					key={`high-peak-${index}`}
					x={peak.time}
					stroke="#10b981"
					strokeWidth={2}
					strokeDasharray="4 4"
					label={{ value: "High", position: "top", fontSize: 12 }}
				/>
			);
		});

		// Add low tide markers (limit to avoid too many)
		troughs.slice(0, 3).forEach((trough, index) => {
			markers.push(
				<ReferenceLine
					key={`low-trough-${index}`}
					x={trough.time}
					stroke="#ef4444"
					strokeWidth={2}
					strokeDasharray="4 4"
					label={{ value: "Low", position: "top", fontSize: 12 }}
				/>
			);
		});

		// Add current time marker (only one, closest to actual time)
		const currentTimePoints = points.filter((p) => p.isNow);
		if (currentTimePoints.length > 0) {
			const closestPoint = currentTimePoints.reduce((closest, point) => {
				const pointDiff = Math.abs(point.hour - currentHour);
				const closestDiff = Math.abs(closest.hour - currentHour);
				return pointDiff < closestDiff ? point : closest;
			});

			markers.push(
				<ReferenceLine
					key="current-time"
					x={closestPoint.time}
					stroke="#f59e0b"
					strokeWidth={3}
					label={{
						value: "Now",
						position: "top",
						fontSize: 12,
						fill: "#f59e0b",
					}}
				/>
			);
		}

		return markers;
	};

	const tidePoints = generateSimpleTidePoints();
	const uniqueMarkers = generateUniqueMarkers(tidePoints);
	const sunTimes = calculateSunTimes(new Date());

	const CustomTooltip = ({ active, payload, label }: any) => {
		if (active && payload?.[0]) {
			const data = payload[0].payload;
			return (
				<div className="bg-white p-3 rounded-lg shadow-lg border">
					<p className="font-semibold">{label}</p>
					<p className="text-blue-600">Tide: {data.percentage}%</p>
					<p className="text-gray-600">
						Height: {data.heightMeters}m
					</p>
					{data.isHighTide && (
						<p className="text-green-600">🌊 High Tide</p>
					)}
					{data.isLowTide && (
						<p className="text-red-600">🏖️ Low Tide</p>
					)}
					{data.isNow && (
						<p className="text-amber-600">📍 Current Time</p>
					)}
					{data.isSunrise && (
						<p className="text-orange-500">🌅 Sunrise</p>
					)}
					{data.isSunset && (
						<p className="text-orange-600">🌇 Sunset</p>
					)}
					{!data.isDaylight && (
						<p className="text-gray-400">🌙 Night</p>
					)}
				</div>
			);
		}
		return null;
	};

	return (
		<div className={`bg-white rounded-lg p-4 ${className}`}>
			<div className="flex justify-between items-center mb-4">
				<h3 className="text-lg font-semibold text-gray-800">
					🌊 Simple Tide Chart
				</h3>
				<div className="text-sm text-gray-600">
					{tideData?.source === "admiralty_uk"
						? "🇬🇧 UK Admiralty"
						: tideData?.source === "enhanced_calculation"
							? "📊 Estimated"
							: tideData?.tideEvents &&
								  tideData.tideEvents.length > 0
								? "🌊 Live Tide Data"
								: "📊 Estimated"}
				</div>
			</div>

			<ResponsiveContainer width="100%" height={height}>
				<LineChart
					data={tidePoints}
					margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
				>
					<CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

					{/* Night time shading */}
					{sunTimes.sunrise > 0 && (
						<ReferenceArea
							x1={`00:00`}
							x2={`${Math.floor(sunTimes.sunrise).toString().padStart(2, "0")}:00`}
							fill="#1f2937"
							fillOpacity={0.2}
						/>
					)}
					{sunTimes.sunset < 24 && (
						<ReferenceArea
							x1={`${Math.floor(sunTimes.sunset).toString().padStart(2, "0")}:00`}
							x2={`23:00`}
							fill="#1f2937"
							fillOpacity={0.2}
						/>
					)}

					{/* Unique tide event and current time markers */}
					{uniqueMarkers}

					{/* Single sunrise marker */}
					{sunTimes.sunrise > 0 && sunTimes.sunrise < 24 && (
						<ReferenceLine
							x={`${Math.floor(sunTimes.sunrise).toString().padStart(2, "0")}:00`}
							stroke="#f97316"
							strokeWidth={1}
							strokeDasharray="2 2"
							label={{
								value: "🌅",
								position: "top",
								fontSize: 12,
							}}
						/>
					)}

					{/* Single sunset marker */}
					{sunTimes.sunset > 0 && sunTimes.sunset < 24 && (
						<ReferenceLine
							x={`${Math.floor(sunTimes.sunset).toString().padStart(2, "0")}:00`}
							stroke="#f97316"
							strokeWidth={1}
							strokeDasharray="2 2"
							label={{
								value: "🌇",
								position: "top",
								fontSize: 12,
							}}
						/>
					)}

					<XAxis
						dataKey="time"
						tick={{ fontSize: 12 }}
						interval={3} // Show every 4th label (hourly since we have 15-min intervals)
					/>
					<YAxis
						domain={[-0.1, 1.1]}
						tick={{ fontSize: 12 }}
						tickFormatter={(value) => `${Math.round(value * 100)}%`}
					/>
					<Tooltip content={<CustomTooltip />} />
					<Line
						type="monotone"
						dataKey="level"
						stroke="#3b82f6"
						strokeWidth={3}
						dot={false}
						activeDot={{ r: 6, fill: "#1d4ed8" }}
					/>
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
}
