import {
	ResponsiveContainer,
	ComposedChart,
	Line,
	Area,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ReferenceLine,
	ReferenceArea,
	Dot,
} from "recharts";

interface TideData {
	currentLevel: number; // 0-1 scale
	isRising: boolean;
	nextHigh: Date;
	nextLow: Date;
	source?: string; // Add source for Admiralty API
	tideEvents?: Array<{
		time: string;
		type: "high" | "low";
		height: number;
	}>; // Add tide events from Admiralty API
}

interface ProfessionalTideChartProps {
	tideData?: TideData | null;
	showHours?: number;
	height?: number;
	className?: string;
	latitude?: number;
	longitude?: number;
	variant?: "full" | "compact" | "daily";
	date?: Date;
}

export default function ProfessionalTideChart({
	tideData,
	showHours = 24,
	height = 200,
	className = "",
	latitude = 50.4,
	longitude = -5.0,
	variant = "full",
	date,
}: ProfessionalTideChartProps) {
	// Calculate sunrise and sunset times (simplified)
	const calculateSunTimes = (date: Date) => {
		const dayOfYear = Math.floor(
			(date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) /
				86400000
		);
		const p = Math.asin(
			0.39795 * Math.cos((0.98563 * (dayOfYear - 173) * Math.PI) / 180)
		);
		const a =
			(Math.sin((-0.83 * Math.PI) / 180) -
				Math.sin((latitude * Math.PI) / 180) * Math.sin(p)) /
			(Math.cos((latitude * Math.PI) / 180) * Math.cos(p));

		if (Math.abs(a) > 1) {
			return {
				sunrise:
					Math.abs(a) > 1 && a > 0
						? null
						: new Date(
								date.getFullYear(),
								date.getMonth(),
								date.getDate(),
								0,
								0
							),
				sunset:
					Math.abs(a) > 1 && a > 0
						? null
						: new Date(
								date.getFullYear(),
								date.getMonth(),
								date.getDate(),
								23,
								59
							),
			};
		}

		const hourAngle = (Math.acos(a) * 180) / Math.PI / 15;
		const solarNoon = 12 - longitude / 15;
		const sunriseHour = solarNoon - hourAngle;
		const sunsetHour = solarNoon + hourAngle;

		const sunrise = new Date(
			date.getFullYear(),
			date.getMonth(),
			date.getDate()
		);
		sunrise.setHours(Math.floor(sunriseHour), (sunriseHour % 1) * 60, 0, 0);

		const sunset = new Date(
			date.getFullYear(),
			date.getMonth(),
			date.getDate()
		);
		sunset.setHours(Math.floor(sunsetHour), (sunsetHour % 1) * 60, 0, 0);

		return { sunrise, sunset };
	};

	// Generate tide points using real Admiralty tide data
	const generateTidePoints = () => {
		interface TidePoint {
			hour: number;
			time: Date;
			level: number;
			levelPercent: number;
			timeLabel: string;
			isNow: boolean;
			isDaylight: boolean;
			isHighTide: boolean;
			isLowTide: boolean;
		}

		const points: TidePoint[] = [];
		const now = new Date();
		const targetDate = variant === "daily" && date ? date : now;
		const startTime = new Date(
			targetDate.getFullYear(),
			targetDate.getMonth(),
			targetDate.getDate(),
			0,
			0,
			0
		);

		// Check if we have real tide events from Admiralty API
		if (
			tideData &&
			tideData.source === "admiralty_uk" &&
			tideData.tideEvents &&
			tideData.tideEvents.length > 0
		) {
			console.log(
				"🇬🇧 Using real Admiralty tide events for chart generation"
			);

			const tideEvents = tideData.tideEvents;

			// Generate hourly points using real tide event interpolation
			for (let i = 0; i < showHours; i++) {
				const hour = i;
				const hourTime = startTime.getTime() + i * 3600000;
				const hourDate = new Date(hourTime);

				// Find surrounding tide events (including extrapolation)
				let before = null;
				let after = null;

				// First try to find exact surrounding events
				for (let j = 0; j < tideEvents.length - 1; j++) {
					const currentEvent = new Date(tideEvents[j].time).getTime();
					const nextEvent = new Date(
						tideEvents[j + 1].time
					).getTime();

					if (currentEvent <= hourTime && hourTime <= nextEvent) {
						before = tideEvents[j];
						after = tideEvents[j + 1];
						break;
					}
				}

				// If no surrounding events found, extrapolate from nearest events
				if (!before || !after) {
					// Find the closest event before this time
					let closestBefore = null;
					let closestAfter = null;

					for (const event of tideEvents) {
						const eventTime = new Date(event.time).getTime();
						if (eventTime <= hourTime) {
							if (
								!closestBefore ||
								eventTime >
									new Date(closestBefore.time).getTime()
							) {
								closestBefore = event;
							}
						} else {
							if (
								!closestAfter ||
								eventTime <
									new Date(closestAfter.time).getTime()
							) {
								closestAfter = event;
							}
						}
					}

					// Use the closest events for extrapolation
					before = closestBefore;
					after = closestAfter;
				}

				let tideLevel = tideData.currentLevel || 0.5; // Default fallback

				if (before && after) {
					// Use the corrected cosine interpolation based on real tide heights
					const beforeTime = new Date(before.time).getTime();
					const afterTime = new Date(after.time).getTime();
					const progress =
						(hourTime - beforeTime) / (afterTime - beforeTime);

					// Normalize heights to 0-1 scale
					const maxHeight = Math.max(
						...tideEvents.map((e) => e.height || 0)
					);
					const minHeight = Math.min(
						...tideEvents.map((e) => e.height || 0)
					);
					const heightRange = maxHeight - minHeight;

					const beforeLevel =
						heightRange > 0
							? (before.height - minHeight) / heightRange
							: 0.5;
					const afterLevel =
						heightRange > 0
							? (after.height - minHeight) / heightRange
							: 0.5;

					let smoothProgress;
					if (after.type === "high" && before.type === "low") {
						// RISING tide: LOW → HIGH, use standard cosine curve
						smoothProgress = (1 - Math.cos(progress * Math.PI)) / 2;
					} else if (after.type === "low" && before.type === "high") {
						// FALLING tide: HIGH → LOW, use inverted cosine curve
						smoothProgress = (1 + Math.cos(progress * Math.PI)) / 2;
					} else {
						// Linear interpolation for same types (shouldn't happen normally)
						smoothProgress = progress;
					}

					tideLevel =
						beforeLevel +
						(afterLevel - beforeLevel) * smoothProgress;
				}

				const clampedLevel = Math.max(0, Math.min(1, tideLevel));

				points.push({
					hour: hour,
					time: hourDate,
					level: clampedLevel,
					levelPercent: Math.round(clampedLevel * 100),
					timeLabel: `${hour.toString().padStart(2, "0")}:00`,
					isNow:
						hour === now.getHours() &&
						targetDate.toDateString() === now.toDateString(),
					isDaylight: hour >= 6 && hour <= 18,
					isHighTide: false, // Will be set below
					isLowTide: false, // Will be set below
				});
			}

			// Mark actual high and low tide times (find closest hour points)
			tideEvents.forEach((event) => {
				const eventTime = new Date(event.time);
				if (eventTime.toDateString() === targetDate.toDateString()) {
					// Find the closest hour point to this tide event
					let closestPoint: TidePoint | null = null;
					let minDistance = Infinity;

					points.forEach((point) => {
						const pointTime = point.time.getTime();
						const distance = Math.abs(
							eventTime.getTime() - pointTime
						);
						if (distance < minDistance) {
							minDistance = distance;
							closestPoint = point;
						}
					});

					if (closestPoint) {
						if (event.type === "high") {
							closestPoint.isHighTide = true;
							console.log(
								`🌊 Marked HIGH tide at ${closestPoint.timeLabel} (actual: ${eventTime.toLocaleTimeString()})`
							);
						} else if (event.type === "low") {
							closestPoint.isLowTide = true;
							console.log(
								`🏖️ Marked LOW tide at ${closestPoint.timeLabel} (actual: ${eventTime.toLocaleTimeString()})`
							);
						}
					}
				}
			});
		} else {
			// Fallback: Generate realistic tide extremes using improved interpolation
			console.log("📊 Using fallback tide calculation");

			const baseLevel = tideData?.currentLevel || 0.5;

			// Generate realistic tide extremes for the day
			const dayOffset = (targetDate.getDate() * 0.7) % (2 * Math.PI);
			const extremes = [];
			for (let i = -1; i <= 2; i++) {
				const extremeTime =
					startTime.getTime() + (6 + i * 6.21) * 3600000;
				const isHigh = i % 2 === 0;
				const height = isHigh
					? 0.8 + 0.2 * Math.sin(dayOffset)
					: 0.2 + 0.1 * Math.cos(dayOffset);
				extremes.push({
					time: new Date(extremeTime),
					height: Math.max(0, Math.min(1, height)),
					type: isHigh ? "high" : "low",
				});
			}

			// Generate hourly points using extremes-based interpolation
			for (let i = 0; i < showHours; i++) {
				const hour = i;
				const hourTime = startTime.getTime() + i * 3600000;
				const hourDate = new Date(hourTime);

				// Find surrounding extremes
				let before = null;
				let after = null;

				for (let j = 0; j < extremes.length - 1; j++) {
					const currentExtreme = extremes[j].time.getTime();
					const nextExtreme = extremes[j + 1].time.getTime();

					if (currentExtreme <= hourTime && hourTime <= nextExtreme) {
						before = extremes[j];
						after = extremes[j + 1];
						break;
					}
				}

				let tideLevel = baseLevel; // Default fallback

				if (before && after) {
					// Use the corrected cosine interpolation
					const beforeTime = before.time.getTime();
					const afterTime = after.time.getTime();
					const progress =
						(hourTime - beforeTime) / (afterTime - beforeTime);

					let smoothProgress;
					if (after.height > before.height) {
						// RISING tide: LOW → HIGH, use standard cosine curve
						smoothProgress = (1 - Math.cos(progress * Math.PI)) / 2;
					} else {
						// FALLING tide: HIGH → LOW, use inverted cosine curve
						smoothProgress = (1 + Math.cos(progress * Math.PI)) / 2;
					}

					tideLevel =
						before.height +
						(after.height - before.height) * smoothProgress;
				}

				const clampedLevel = Math.max(0, Math.min(1, tideLevel));

				points.push({
					hour: hour,
					time: hourDate,
					level: clampedLevel,
					levelPercent: Math.round(clampedLevel * 100),
					timeLabel: `${hour.toString().padStart(2, "0")}:00`,
					isNow:
						hour === now.getHours() &&
						targetDate.toDateString() === now.toDateString(),
					isDaylight: hour >= 6 && hour <= 18,
					isHighTide: false, // Will be set below
					isLowTide: false, // Will be set below
				});
			}
		}
		const lunarCycleMs = 12.42 * 60 * 60 * 1000; // ~12.42 hours between tides

		// Generate realistic tide extremes for the day
		const dayOffset = (targetDate.getDate() * 0.7) % (2 * Math.PI);
		const extremes = [];
		for (let i = -1; i <= 2; i++) {
			const extremeTime = startTime.getTime() + (6 + i * 6.21) * 3600000; // ~6.21 hour intervals
			const isHigh = i % 2 === 0;
			const height = isHigh
				? 0.8 + 0.2 * Math.sin(dayOffset)
				: 0.2 + 0.1 * Math.cos(dayOffset);
			extremes.push({
				time: new Date(extremeTime),
				height: Math.max(0, Math.min(1, height)),
				type: isHigh ? "high" : "low",
			});
		}

		// Generate hourly points using extremes-based interpolation
		for (let i = 0; i < showHours; i++) {
			const hour = i;
			const hourTime = startTime.getTime() + i * 3600000;
			const hourDate = new Date(hourTime);

			// Find surrounding extremes
			let before = null;
			let after = null;

			for (let j = 0; j < extremes.length - 1; j++) {
				const currentExtreme = extremes[j].time.getTime();
				const nextExtreme = extremes[j + 1].time.getTime();

				if (currentExtreme <= hourTime && hourTime <= nextExtreme) {
					before = extremes[j];
					after = extremes[j + 1];
					break;
				}
			}

			let tideLevel = tideData?.currentLevel || 0.5; // Default fallback

			if (before && after) {
				// Use the same corrected cosine interpolation as backend
				const beforeTime = before.time.getTime();
				const afterTime = after.time.getTime();
				const progress =
					(hourTime - beforeTime) / (afterTime - beforeTime);

				let smoothProgress;
				if (after.height > before.height) {
					// RISING tide: LOW → HIGH, use standard cosine curve
					smoothProgress = (1 - Math.cos(progress * Math.PI)) / 2;
				} else {
					// FALLING tide: HIGH → LOW, use inverted cosine curve
					smoothProgress = (1 + Math.cos(progress * Math.PI)) / 2;
				}

				tideLevel =
					before.height +
					(after.height - before.height) * smoothProgress;
			}

			const clampedLevel = Math.max(0, Math.min(1, tideLevel));

			points.push({
				hour: hour,
				time: hourDate,
				level: clampedLevel,
				levelPercent: Math.round(clampedLevel * 100),
				timeLabel: `${hour.toString().padStart(2, "0")}:00`,
				isNow:
					hour === now.getHours() &&
					targetDate.toDateString() === now.toDateString(),
				isDaylight: hour >= 6 && hour <= 18,
				isHighTide: false, // Will be set below
				isLowTide: false, // Will be set below
			});
		}

		// Identify high and low tides
		for (let i = 1; i < points.length - 1; i++) {
			const prev = points[i - 1];
			const current = points[i];
			const next = points[i + 1];

			if (
				current.level > prev.level &&
				current.level > next.level &&
				current.level > 0.8
			) {
				current.isHighTide = true;
			}

			if (
				current.level < prev.level &&
				current.level < next.level &&
				current.level < 0.2
			) {
				current.isLowTide = true;
			}
		}

		return points;
	};

	const tidePoints = generateTidePoints();
	const now = new Date();
	const targetDate =
		variant === "daily" && date
			? date
			: new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const sunTimes = calculateSunTimes(targetDate);
	const currentHour = now.getHours();
	const currentMinutes = now.getMinutes();

	// Calculate precise current time position (hour + fraction for minutes)
	const currentTimePosition = currentHour + currentMinutes / 60;

	// Force both areas to always render on daily variant
	const forceRender = variant === "daily";

	// Debug log for development
	if (
		process.env.NODE_ENV === "development" &&
		sunTimes.sunrise &&
		sunTimes.sunset
	) {
		console.log("Sun times debug:", {
			variant,
			date: targetDate.toISOString().split("T")[0],
			sunrise: `${sunTimes.sunrise.getHours()}:${sunTimes.sunrise.getMinutes().toString().padStart(2, "0")}`,
			sunset: `${sunTimes.sunset.getHours()}:${sunTimes.sunset.getMinutes().toString().padStart(2, "0")}`,
			sunriseFloor: Math.floor(sunTimes.sunrise.getHours()),
			sunsetFloor: Math.floor(sunTimes.sunset.getHours()),
			showHours,
			beforeSunriseArea: Math.floor(sunTimes.sunrise.getHours()) > 0,
			afterSunsetArea: Math.floor(sunTimes.sunset.getHours()) < 23,
			beforeSunriseRange: `0 to ${Math.floor(sunTimes.sunrise.getHours())}`,
			afterSunsetRange: `${Math.floor(sunTimes.sunset.getHours())} to 23`,
		});
	}

	// Custom tooltip
	const CustomTooltip = ({ active, payload, label }: any) => {
		if (active && payload && payload.length) {
			const data = payload[0].payload;
			return (
				<div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
					<p className="font-semibold text-gray-800">{`${label}:00`}</p>
					<p className="text-blue-600">{`Tide: ${data.levelPercent}%`}</p>
					{data.isHighTide && (
						<p className="text-green-600 font-semibold">
							🌊 High Tide
						</p>
					)}
					{data.isLowTide && (
						<p className="text-red-600 font-semibold">
							🏖️ Low Tide
						</p>
					)}
					{data.isNow && (
						<p className="text-amber-600 font-bold">
							📍 Current Time
						</p>
					)}
				</div>
			);
		}
		return null;
	};

	// Custom dot for special points
	const CustomDot = (props: any) => {
		const { cx, cy, payload } = props;

		if (payload.isHighTide) {
			return (
				<Dot
					cx={cx}
					cy={cy}
					r={6}
					fill="#10b981"
					stroke="#059669"
					strokeWidth={2}
				/>
			);
		}

		if (payload.isLowTide) {
			return (
				<Dot
					cx={cx}
					cy={cy}
					r={6}
					fill="#ef4444"
					stroke="#dc2626"
					strokeWidth={2}
				/>
			);
		}

		// Remove the isNow dot since we have a precise reference line

		return null;
	};

	return (
		<div
			className={`bg-white rounded-xl shadow-lg border-0 overflow-hidden ${className}`}
		>
			<div className="p-4">
				{variant !== "daily" && (
					<div className="flex items-center justify-between mb-4">
						<h4 className="text-lg font-semibold text-gray-800">
							🌊 {showHours}-Hour Tide Chart
						</h4>
						{tideData && (
							<div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-full px-3 py-1 border border-blue-200">
								<div className="text-sm font-semibold text-blue-700">
									Current:{" "}
									{Math.round(tideData.currentLevel * 100)}%{" "}
									{tideData.isRising ? "↗️" : "↘️"}
								</div>
							</div>
						)}
					</div>
				)}

				{variant === "daily" && (
					<div className="mb-2">
						<h4 className="text-sm font-semibold text-gray-700 text-center">
							Daily Tides{" "}
							{date
								? `- ${date.toLocaleDateString("en-GB", { weekday: "short", month: "short", day: "numeric" })}`
								: ""}
						</h4>
					</div>
				)}

				<div style={{ height: `${height}px` }}>
					<ResponsiveContainer width="100%" height="100%">
						<ComposedChart
							data={tidePoints}
							margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
						>
							<defs>
								<linearGradient
									id="tideGradient"
									x1="0"
									y1="0"
									x2="0"
									y2="1"
								>
									<stop
										offset="0%"
										stopColor="#0284c7"
										stopOpacity={0.8}
									/>
									<stop
										offset="50%"
										stopColor="#0ea5e9"
										stopOpacity={0.4}
									/>
									<stop
										offset="100%"
										stopColor="#38bdf8"
										stopOpacity={0.1}
									/>
								</linearGradient>
							</defs>

							<CartesianGrid
								strokeDasharray="3 3"
								stroke="#e5e7eb"
								opacity={0.3}
							/>

							<XAxis
								dataKey="hour"
								tickFormatter={(value) => `${value}:00`}
								stroke="#6b7280"
								fontSize={12}
								interval={0}
								type="number"
								domain={[0, 23]}
								ticks={[
									0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
									13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
								]}
							/>

							<YAxis
								domain={[0, 100]}
								tickFormatter={(value) => `${value}%`}
								stroke="#0ea5e9"
								fontSize={12}
								label={{
									value: "Tide Level",
									angle: -90,
									position: "insideLeft",
									style: { textAnchor: "middle" },
								}}
							/>

							{/* Reference lines */}
							<ReferenceLine
								y={80}
								stroke="#0ea5e9"
								strokeDasharray="4 2"
								opacity={0.5}
							/>
							<ReferenceLine
								y={50}
								stroke="#64748b"
								strokeDasharray="3 3"
								opacity={0.3}
							/>
							<ReferenceLine
								y={20}
								stroke="#0ea5e9"
								strokeDasharray="4 2"
								opacity={0.5}
							/>

							{/* Current time reference line */}
							<ReferenceLine
								x={currentTimePosition}
								stroke="#ef4444"
								strokeDasharray="4 4"
								opacity={0.8}
								label={{
									value: `NOW ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`,
									position: "top",
									fill: "#dc2626",
									fontSize: 10,
									offset: 10,
								}}
							/>

							{/* Sunrise reference line */}
							{sunTimes.sunrise &&
								sunTimes.sunrise.getHours() < showHours && (
									<ReferenceLine
										x={Math.floor(
											sunTimes.sunrise.getHours()
										)}
										stroke="#fbbf24"
										strokeDasharray="6 3"
										opacity={0.8}
										label={{
											value: "☀️ SUNRISE",
											position: "top",
											fill: "#f59e0b",
											fontSize: 10,
											offset: 10,
										}}
									/>
								)}

							{/* Sunset reference line */}
							{sunTimes.sunset &&
								sunTimes.sunset.getHours() < showHours && (
									<ReferenceLine
										x={Math.floor(
											sunTimes.sunset.getHours()
										)}
										stroke="#f97316"
										strokeDasharray="6 3"
										opacity={0.8}
										label={{
											value: "🌅 SUNSET",
											position: "top",
											fill: "#ea580c",
											fontSize: 10,
											offset: 10,
										}}
									/>
								)}

							{/* Tide area */}
							<Area
								type="monotone"
								dataKey="levelPercent"
								stroke="#0284c7"
								strokeWidth={3}
								fill="url(#tideGradient)"
								name="Tide Level"
								dot={<CustomDot />}
							/>

							{/* Simple approach - debug why x1=0 fails on daily */}
							<>
								{/* Before sunrise - force render with explicit props */}
								<ReferenceArea
									x1={0}
									x2={Math.floor(
										sunTimes.sunrise?.getHours() || 5
									)}
									fill="#1e293b"
									fillOpacity={0.15}
									stroke="none"
									ifOverflow="visible"
									key={`sunrise-${variant}-${Math.floor(sunTimes.sunrise?.getHours() || 5)}`}
								/>

								{/* After sunset */}
								<ReferenceArea
									x1={Math.floor(
										sunTimes.sunset?.getHours() || 19
									)}
									x2={23}
									fill="#1e293b"
									fillOpacity={0.15}
									stroke="none"
									ifOverflow="visible"
									key={`sunset-${variant}-${Math.floor(sunTimes.sunset?.getHours() || 19)}`}
								/>
							</>

							<Tooltip content={<CustomTooltip />} />
						</ComposedChart>
					</ResponsiveContainer>
				</div>

				{/* Time labels and info */}
				{/* <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
					<div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-2 border border-blue-200 shadow-sm">
						<div className="text-xs font-semibold text-blue-800">
							Current Tide
						</div>
						<div className="text-lg font-bold text-blue-600">
							{tideData
								? `${Math.round(tideData.currentLevel * 100)}%`
								: `${tidePoints[currentHour]?.levelPercent || 50}%`}
						</div>
						<div className="text-xs text-blue-600">
							{tideData?.isRising ? "Rising ↗️" : "Falling ↘️"}
						</div>
					</div>

					<div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-2 border border-green-200 shadow-sm">
						<div className="text-xs font-semibold text-green-800">
							High Tide
						</div>
						<div className="text-lg font-bold text-green-600">
							{Math.max(...tidePoints.map((p) => p.levelPercent))}
							%
						</div>
						<div className="text-xs text-green-600">Peak level</div>
					</div>

					<div className="bg-gradient-to-r from-red-50 to-red-100 rounded-lg p-2 border border-red-200 shadow-sm">
						<div className="text-xs font-semibold text-red-800">
							Low Tide
						</div>
						<div className="text-lg font-bold text-red-600">
							{Math.min(...tidePoints.map((p) => p.levelPercent))}
							%
						</div>
						<div className="text-xs text-red-600">Lowest level</div>
					</div>

					<div className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-lg p-2 border border-amber-200 shadow-sm">
						<div className="text-xs font-semibold text-amber-800">
							Daylight
						</div>
						<div className="text-lg font-bold text-amber-600">
							{sunTimes.sunrise && sunTimes.sunset
								? `${sunTimes.sunrise.getHours()}:00-${sunTimes.sunset.getHours()}:00`
								: "6:00-18:00"}
						</div>
						<div className="text-xs text-amber-600">Sun hours</div>
					</div>
				</div> */}

				{!tideData && (
					<div className="text-center bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
						<div className="text-xs text-blue-700 font-medium">
							🔄 Live tide data loading... showing approximate
							values
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
