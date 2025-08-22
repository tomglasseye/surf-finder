interface TideData {
	currentLevel: number; // 0-1 scale
	isRising: boolean;
	nextHigh: Date;
	nextLow: Date;
}

interface TideGraphProps {
	tideData?: TideData | null;
	showHours?: number; // How many hours to show (default 24)
	height?: string; // CSS height (default '200px')
	className?: string;
	latitude?: number; // For sunrise/sunset calculation
	longitude?: number; // For sunrise/sunset calculation
	variant?: "full" | "compact" | "daily"; // Display variant
	date?: Date; // Specific date for daily view
}

export default function TideGraph({
	tideData,
	showHours = 24,
	height = "200px",
	className = "",
	latitude = 50.4, // Default to Cornwall
	longitude = -5.0,
	variant = "full",
	date,
}: TideGraphProps) {
	// Calculate sunrise and sunset times
	const calculateSunTimes = (date: Date) => {
		// Simplified sunrise/sunset calculation (approximation)
		// For production, you'd want to use a proper library like suncalc
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

		// Handle polar day/night scenarios
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

	// Generate hourly tide data points
	const generateTidePoints = () => {
		const points = [];
		const now = new Date();

		// For daily variant, use specific date; otherwise use current day
		const targetDate = variant === "daily" && date ? date : now;
		const startTime = new Date(
			targetDate.getFullYear(),
			targetDate.getMonth(),
			targetDate.getDate(),
			0,
			0,
			0
		); // Start of target day

		// If no tide data, use mock/calculated data
		const baseLevel = tideData?.currentLevel || 0.5;
		const lunarCycleMs = 12.42 * 60 * 60 * 1000; // ~12.42 hours between high tides
		const currentTime = now.getTime();

		// Generate hours 0-23 to have midday (12) in the middle
		for (let i = 0; i < showHours; i++) {
			const hour = i; // Hours from 0 to 23
			const hourTime = startTime.getTime() + i * 3600000;
			const hourDate = new Date(hourTime);

			// Calculate tide level using sinusoidal pattern
			const timeDiff = hourTime - currentTime;
			const cyclePosition = (timeDiff / lunarCycleMs) * 2 * Math.PI;
			const tideLevel =
				0.5 +
				0.5 * Math.cos(cyclePosition + Math.acos(2 * baseLevel - 1));

			// Clamp between 0 and 1
			const clampedLevel = Math.max(0, Math.min(1, tideLevel));

			points.push({
				hour: hour,
				time: hourDate,
				level: clampedLevel,
				isNow: hour === now.getHours(),
				isHighTide: false, // Will be set below
				isLowTide: false,
			});
		}

		// Identify high and low tide points
		for (let i = 1; i < points.length - 1; i++) {
			const prev = points[i - 1];
			const current = points[i];
			const next = points[i + 1];

			// High tide: higher than neighbors and above 0.8
			if (
				current.level > prev.level &&
				current.level > next.level &&
				current.level > 0.8
			) {
				current.isHighTide = true;
			}

			// Low tide: lower than neighbors and below 0.2
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
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const sunTimes = calculateSunTimes(today);

	const graphWidth = 100; // SVG viewBox width
	const graphHeight = 100; // SVG viewBox height

	// Create SVG path for tide curve
	const createTidePath = () => {
		const pathData = tidePoints
			.map((point, index) => {
				const x = (index / (showHours - 1)) * graphWidth;
				const y = graphHeight - point.level * graphHeight;
				return `${index === 0 ? "M" : "L"} ${x} ${y}`;
			})
			.join(" ");

		return pathData;
	};

	const formatHour = (time: Date) => {
		return time.toLocaleTimeString("en-GB", {
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		});
	};

	const getTideHeight = (level: number) => {
		return `${(level * 100).toFixed(0)}%`;
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
									{getTideHeight(tideData.currentLevel)}{" "}
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

				<div
					className="relative bg-gradient-to-b from-cyan-50 via-blue-50 to-blue-100 rounded-lg p-3 shadow-inner"
					style={{ height }}
				>
					<svg
						viewBox={`0 0 ${graphWidth} ${graphHeight}`}
						className="w-full h-full"
						preserveAspectRatio="none"
					>
						{/* Enhanced gradients and filters */}
						<defs>
							{/* Subtle grid pattern */}
							<pattern
								id="tideGrid"
								width="8.33"
								height="20"
								patternUnits="userSpaceOnUse"
							>
								<path
									d="M 8.33 0 L 0 0 0 20"
									fill="none"
									stroke="#cbd5e1"
									strokeWidth="0.3"
									opacity="0.4"
								/>
								<path
									d="M 0 20 L 8.33 20"
									fill="none"
									stroke="#cbd5e1"
									strokeWidth="0.3"
									opacity="0.2"
								/>
							</pattern>

							{/* Enhanced daylight gradient */}
							<linearGradient
								id="daylightGradient"
								x1="0%"
								y1="0%"
								x2="0%"
								y2="100%"
							>
								<stop
									offset="0%"
									stopColor="#fbbf24"
									stopOpacity="0.25"
								/>
								<stop
									offset="50%"
									stopColor="#fef3c7"
									stopOpacity="0.15"
								/>
								<stop
									offset="100%"
									stopColor="#fef3c7"
									stopOpacity="0.05"
								/>
							</linearGradient>

							{/* Enhanced nighttime gradient */}
							<linearGradient
								id="nightGradient"
								x1="0%"
								y1="0%"
								x2="0%"
								y2="100%"
							>
								<stop
									offset="0%"
									stopColor="#1e293b"
									stopOpacity="0.3"
								/>
								<stop
									offset="50%"
									stopColor="#334155"
									stopOpacity="0.15"
								/>
								<stop
									offset="100%"
									stopColor="#475569"
									stopOpacity="0.05"
								/>
							</linearGradient>

							{/* Enhanced tide gradient */}
							<linearGradient
								id="tideGradient"
								x1="0%"
								y1="0%"
								x2="0%"
								y2="100%"
							>
								<stop
									offset="0%"
									stopColor="#0284c7"
									stopOpacity="0.6"
								/>
								<stop
									offset="30%"
									stopColor="#0ea5e9"
									stopOpacity="0.4"
								/>
								<stop
									offset="70%"
									stopColor="#38bdf8"
									stopOpacity="0.2"
								/>
								<stop
									offset="100%"
									stopColor="#7dd3fc"
									stopOpacity="0.1"
								/>
							</linearGradient>

							{/* High tide gradient */}
							<radialGradient
								id="highTideGradient"
								cx="50%"
								cy="50%"
							>
								<stop
									offset="0%"
									stopColor="#10b981"
									stopOpacity="0.8"
								/>
								<stop
									offset="100%"
									stopColor="#059669"
									stopOpacity="0.6"
								/>
							</radialGradient>

							{/* Low tide gradient */}
							<radialGradient
								id="lowTideGradient"
								cx="50%"
								cy="50%"
							>
								<stop
									offset="0%"
									stopColor="#ef4444"
									stopOpacity="0.8"
								/>
								<stop
									offset="100%"
									stopColor="#dc2626"
									stopOpacity="0.6"
								/>
							</radialGradient>

							{/* Drop shadow filter */}
							<filter
								id="tideDropShadow"
								x="-20%"
								y="-20%"
								width="140%"
								height="140%"
							>
								<feDropShadow
									dx="0"
									dy="2"
									stdDeviation="2"
									floodColor="#000"
									floodOpacity="0.15"
								/>
							</filter>

							{/* Glow filter */}
							<filter id="glow">
								<feGaussianBlur
									stdDeviation="1"
									result="coloredBlur"
								/>
								<feMerge>
									<feMergeNode in="coloredBlur" />
									<feMergeNode in="SourceGraphic" />
								</feMerge>
							</filter>
						</defs>

						<rect
							width="100%"
							height="100%"
							fill="url(#tideGrid)"
						/>

						{/* Daylight/Nighttime background */}
						{(() => {
							const backgrounds = [];
							const startTime = new Date(
								now.getTime() - now.getHours() * 3600000
							); // Start of today

							if (sunTimes.sunrise && sunTimes.sunset) {
								const sunriseHour =
									(sunTimes.sunrise.getTime() -
										startTime.getTime()) /
									(1000 * 60 * 60);
								const sunsetHour =
									(sunTimes.sunset.getTime() -
										startTime.getTime()) /
									(1000 * 60 * 60);

								// Night from start to sunrise
								if (sunriseHour > 0) {
									const x1 = 0;
									const x2 = Math.min(
										(sunriseHour / (showHours - 1)) *
											graphWidth,
										graphWidth
									);
									backgrounds.push(
										<rect
											key="night1"
											x={x1}
											y="0"
											width={x2 - x1}
											height="100%"
											fill="url(#nightGradient)"
										/>
									);
								}

								// Day from sunrise to sunset
								if (sunriseHour < showHours && sunsetHour > 0) {
									const x1 = Math.max(
										(sunriseHour / (showHours - 1)) *
											graphWidth,
										0
									);
									const x2 = Math.min(
										(sunsetHour / (showHours - 1)) *
											graphWidth,
										graphWidth
									);
									if (x2 > x1) {
										backgrounds.push(
											<rect
												key="day"
												x={x1}
												y="0"
												width={x2 - x1}
												height="100%"
												fill="url(#daylightGradient)"
											/>
										);
									}
								}

								// Night from sunset to end
								if (sunsetHour < showHours) {
									const x1 = Math.max(
										(sunsetHour / (showHours - 1)) *
											graphWidth,
										0
									);
									const x2 = graphWidth;
									backgrounds.push(
										<rect
											key="night2"
											x={x1}
											y="0"
											width={x2 - x1}
											height="100%"
											fill="url(#nightGradient)"
										/>
									);
								}
							}

							return backgrounds;
						})()}

						{/* Enhanced reference lines */}
						<line
							x1="0"
							y1="20"
							x2={graphWidth}
							y2="20"
							stroke="#0ea5e9"
							strokeWidth="0.8"
							strokeDasharray="4,3"
							opacity="0.4"
						/>
						<text
							x="2"
							y="18"
							className="text-xs fill-blue-600 font-medium"
							opacity="0.7"
						>
							High
						</text>

						<line
							x1="0"
							y1="50"
							x2={graphWidth}
							y2="50"
							stroke="#64748b"
							strokeWidth="0.6"
							strokeDasharray="3,3"
							opacity="0.3"
						/>
						<text
							x="2"
							y="48"
							className="text-xs fill-gray-600 font-medium"
							opacity="0.6"
						>
							Mid
						</text>

						<line
							x1="0"
							y1="80"
							x2={graphWidth}
							y2="80"
							stroke="#0ea5e9"
							strokeWidth="0.8"
							strokeDasharray="4,3"
							opacity="0.4"
						/>
						<text
							x="2"
							y="78"
							className="text-xs fill-blue-600 font-medium"
							opacity="0.7"
						>
							Low
						</text>

						{/* Enhanced fill area under curve */}
						<path
							d={`${createTidePath()} L ${graphWidth} ${graphHeight} L 0 ${graphHeight} Z`}
							fill="url(#tideGradient)"
							filter="url(#tideDropShadow)"
						/>

						{/* Enhanced tide curve with glow */}
						<path
							d={createTidePath()}
							fill="none"
							stroke="#0284c7"
							strokeWidth="4"
							filter="url(#glow)"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>

						{/* Main tide curve */}
						<path
							d={createTidePath()}
							fill="none"
							stroke="#0ea5e9"
							strokeWidth="3"
							filter="url(#tideDropShadow)"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>

						{/* Enhanced High/Low tide markers */}
						{tidePoints.map((point, index) => {
							const x = (index / (showHours - 1)) * graphWidth;
							const y = graphHeight - point.level * graphHeight;

							if (point.isHighTide) {
								return (
									<g key={`high-${index}`}>
										{/* Glow effect */}
										<circle
											cx={x}
											cy={y}
											r="8"
											fill="url(#highTideGradient)"
											opacity="0.3"
											filter="url(#glow)"
										/>
										<circle
											cx={x}
											cy={y}
											r="5"
											fill="white"
											stroke="#10b981"
											strokeWidth="2"
											filter="url(#tideDropShadow)"
										/>
										<circle
											cx={x}
											cy={y}
											r="3"
											fill="#10b981"
										/>
										<text
											x={x}
											y={y - 12}
											textAnchor="middle"
											className="text-xs fill-green-700 font-bold drop-shadow-sm"
										>
											HIGH
										</text>
										<text
											x={x}
											y={y - 2}
											textAnchor="middle"
											className="text-xs fill-white font-bold"
										>
											H
										</text>
									</g>
								);
							}

							if (point.isLowTide) {
								return (
									<g key={`low-${index}`}>
										{/* Glow effect */}
										<circle
											cx={x}
											cy={y}
											r="8"
											fill="url(#lowTideGradient)"
											opacity="0.3"
											filter="url(#glow)"
										/>
										<circle
											cx={x}
											cy={y}
											r="5"
											fill="white"
											stroke="#ef4444"
											strokeWidth="2"
											filter="url(#tideDropShadow)"
										/>
										<circle
											cx={x}
											cy={y}
											r="3"
											fill="#ef4444"
										/>
										<text
											x={x}
											y={y + 18}
											textAnchor="middle"
											className="text-xs fill-red-700 font-bold drop-shadow-sm"
										>
											LOW
										</text>
										<text
											x={x}
											y={y + 2}
											textAnchor="middle"
											className="text-xs fill-white font-bold"
										>
											L
										</text>
									</g>
								);
							}

							if (point.isNow) {
								return (
									<g key={`now-${index}`}>
										{/* Current time line with gradient */}
										<line
											x1={x}
											y1="0"
											x2={x}
											y2={graphHeight}
											stroke="#f59e0b"
											strokeWidth="3"
											strokeDasharray="5,3"
											opacity="0.8"
											filter="url(#glow)"
										/>
										<circle
											cx={x}
											cy={y}
											r="8"
											fill="#fbbf24"
											opacity="0.3"
											filter="url(#glow)"
										/>
										<circle
											cx={x}
											cy={y}
											r="6"
											fill="white"
											stroke="#f59e0b"
											strokeWidth="3"
											filter="url(#tideDropShadow)"
										/>
										<circle
											cx={x}
											cy={y}
											r="3"
											fill="#f59e0b"
										/>
										<text
											x={x}
											y={y - 15}
											textAnchor="middle"
											className="text-xs fill-amber-700 font-bold drop-shadow-sm bg-white bg-opacity-80 px-2 py-1 rounded"
										>
											NOW
										</text>
									</g>
								);
							}

							return null;
						})}

						{/* Enhanced Sunrise/Sunset markers */}
						{(() => {
							const markers = [];
							const startTime = new Date(
								now.getTime() - now.getHours() * 3600000
							); // Start of today

							if (sunTimes.sunrise) {
								const sunriseHour =
									(sunTimes.sunrise.getTime() -
										startTime.getTime()) /
									(1000 * 60 * 60);
								if (
									sunriseHour >= 0 &&
									sunriseHour < showHours
								) {
									const x =
										(sunriseHour / (showHours - 1)) *
										graphWidth;
									markers.push(
										<g key="sunrise">
											<line
												x1={x}
												y1="8"
												x2={x}
												y2={graphHeight - 8}
												stroke="#fbbf24"
												strokeWidth="2"
												strokeDasharray="6,3"
												opacity="0.7"
												filter="url(#glow)"
											/>
											<circle
												cx={x}
												cy="12"
												r="10"
												fill="#fbbf24"
												opacity="0.2"
												filter="url(#glow)"
											/>
											<circle
												cx={x}
												cy="12"
												r="8"
												fill="white"
												stroke="#f59e0b"
												strokeWidth="2"
												filter="url(#tideDropShadow)"
											/>
											<circle
												cx={x}
												cy="12"
												r="5"
												fill="#fbbf24"
											/>
											<text
												x={x}
												y="7"
												textAnchor="middle"
												className="text-xs fill-amber-700 font-bold"
											>
												SUNRISE
											</text>
											<text
												x={x}
												y="16"
												textAnchor="middle"
												className="text-sm"
											>
												☀️
											</text>
										</g>
									);
								}
							}

							if (sunTimes.sunset) {
								const sunsetHour =
									(sunTimes.sunset.getTime() -
										startTime.getTime()) /
									(1000 * 60 * 60);
								if (sunsetHour >= 0 && sunsetHour < showHours) {
									const x =
										(sunsetHour / (showHours - 1)) *
										graphWidth;
									markers.push(
										<g key="sunset">
											<line
												x1={x}
												y1="8"
												x2={x}
												y2={graphHeight - 8}
												stroke="#f97316"
												strokeWidth="2"
												strokeDasharray="6,3"
												opacity="0.7"
												filter="url(#glow)"
											/>
											<circle
												cx={x}
												cy="12"
												r="10"
												fill="#f97316"
												opacity="0.2"
												filter="url(#glow)"
											/>
											<circle
												cx={x}
												cy="12"
												r="8"
												fill="white"
												stroke="#f97316"
												strokeWidth="2"
												filter="url(#tideDropShadow)"
											/>
											<circle
												cx={x}
												cy="12"
												r="5"
												fill="#f97316"
											/>
											<text
												x={x}
												y="7"
												textAnchor="middle"
												className="text-xs fill-orange-700 font-bold"
											>
												SUNSET
											</text>
											<text
												x={x}
												y="16"
												textAnchor="middle"
												className="text-sm"
											>
												🌅
											</text>
										</g>
									);
								}
							}

							return markers;
						})()}
					</svg>
				</div>

				{/* Enhanced time labels - show time under each point */}
				<div className="flex justify-between mt-4 px-2">
					{tidePoints.map((point, index) => {
						const isNow = point.hour === new Date().getHours();
						// Always show all labels to display time under each point
						const showLabel = true;

						if (!showLabel)
							return <div key={index} className="flex-1"></div>; // Empty spacer

						return (
							<div
								key={index}
								className={`text-center flex-1 ${isNow ? "bg-amber-50 rounded-lg px-1 py-1 border border-amber-200" : ""}`}
							>
								<div
									className={`text-xs font-semibold ${isNow ? "text-amber-700" : "text-gray-600"}`}
								>
									{formatHour(point.time)}
								</div>
								<div
									className={`text-xs font-bold ${isNow ? "text-amber-600" : "text-blue-600"}`}
								>
									{getTideHeight(point.level)}
								</div>
								{isNow && (
									<div className="text-xs text-amber-600 font-bold">
										NOW
									</div>
								)}
							</div>
						);
					})}
				</div>

				{/* Enhanced Legend */}
				{variant === "daily" ? (
					<div className="mt-3 flex flex-wrap gap-2 justify-center">
						<div className="flex items-center gap-1 bg-green-50 rounded-full px-2 py-1 border border-green-200">
							<div className="w-2 h-2 bg-green-500 rounded-full"></div>
							<span className="text-xs text-green-700 font-medium">
								High
							</span>
						</div>
						<div className="flex items-center gap-1 bg-red-50 rounded-full px-2 py-1 border border-red-200">
							<div className="w-2 h-2 bg-red-500 rounded-full"></div>
							<span className="text-xs text-red-700 font-medium">
								Low
							</span>
						</div>
						<div className="flex items-center gap-1 bg-amber-50 rounded-full px-2 py-1 border border-amber-200">
							<span className="text-xs">☀️</span>
							<span className="text-xs text-amber-700 font-medium">
								Sun
							</span>
						</div>
						{!tideData && (
							<div className="bg-orange-50 rounded-full px-2 py-1 border border-orange-200">
								<span className="text-xs text-orange-700 font-medium">
									🔄 Demo
								</span>
							</div>
						)}
					</div>
				) : (
					<div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
						<div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-2 border border-green-200 shadow-sm">
							<div className="flex items-center gap-2 mb-1">
								<div className="w-3 h-3 bg-green-500 rounded-full shadow-sm"></div>
								<span className="text-xs font-semibold text-green-800">
									High Tide
								</span>
							</div>
							<div className="text-xs text-green-600">
								Peak water levels
							</div>
						</div>

						<div className="bg-gradient-to-r from-red-50 to-red-100 rounded-lg p-2 border border-red-200 shadow-sm">
							<div className="flex items-center gap-2 mb-1">
								<div className="w-3 h-3 bg-red-500 rounded-full shadow-sm"></div>
								<span className="text-xs font-semibold text-red-800">
									Low Tide
								</span>
							</div>
							<div className="text-xs text-red-600">
								Lowest water levels
							</div>
						</div>

						<div className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-lg p-2 border border-amber-200 shadow-sm">
							<div className="flex items-center gap-2 mb-1">
								<div className="w-3 h-3 bg-amber-500 rounded-full shadow-sm"></div>
								<span className="text-xs font-semibold text-amber-800">
									Current Time
								</span>
							</div>
							<div className="text-xs text-amber-600">
								Right now
							</div>
						</div>

						<div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg p-2 border border-yellow-200 shadow-sm">
							<div className="flex items-center gap-2 mb-1">
								<span className="text-sm">☀️</span>
								<span className="text-xs font-semibold text-yellow-800">
									Sunrise
								</span>
							</div>
							<div className="text-xs text-yellow-600">
								Dawn light
							</div>
						</div>

						<div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-2 border border-orange-200 shadow-sm">
							<div className="flex items-center gap-2 mb-1">
								<span className="text-sm">🌅</span>
								<span className="text-xs font-semibold text-orange-800">
									Sunset
								</span>
							</div>
							<div className="text-xs text-orange-600">
								Evening light
							</div>
						</div>

						{!tideData && (
							<div className="col-span-full bg-blue-50 border border-blue-200 rounded-lg p-3">
								<div className="text-center text-xs text-blue-700 font-medium">
									🔄 Live tide data loading... showing
									approximate values
								</div>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
