import DataOverlay from "./DataOverlay";

interface WindDirectionCompassProps {
	spotDirection?: number; // Direction the surf spot faces (e.g., 180 for south-facing)
	windDirection?: number; // Current wind direction in degrees
	hourlyWindData?: number[]; // Array of hourly wind directions
	className?: string;
	height?: number;
	variant?: "full" | "compact";
	showHourlyUpdates?: boolean; // Whether to cycle through hourly data
	dataSource?: string;
}

export default function WindDirectionCompass({
	spotDirection = 180, // Default south-facing
	windDirection = 225, // Default SW wind
	hourlyWindData,
	className = "",
	height = 120,
	variant = "full",
	showHourlyUpdates = false,
	dataSource = "unknown",
}: WindDirectionCompassProps) {
	// Helper function to get wind condition relative to surf spot
	const getWindCondition = (
		spotDir: number,
		windDir: number
	): { condition: string; color: string; description: string } => {
		// Calculate the difference between wind direction and spot direction
		let diff = Math.abs(windDir - spotDir);
		if (diff > 180) diff = 360 - diff;

		// Determine if wind is offshore, onshore, or cross-shore
		if (diff <= 45) {
			return {
				condition: "Onshore",
				color: "#ef4444",
				description: "Wind blowing onto shore - messy waves",
			};
		} else if (diff >= 135) {
			return {
				condition: "Offshore",
				color: "#10b981",
				description: "Wind blowing off shore - clean waves",
			};
		} else {
			return {
				condition: "Cross-shore",
				color: "#f59e0b",
				description: "Side wind - mixed conditions",
			};
		}
	};

	// Helper to convert degrees to compass direction
	const getCompassDirection = (degrees: number): string => {
		const directions = [
			"N",
			"NNE",
			"NE",
			"ENE",
			"E",
			"ESE",
			"SE",
			"SSE",
			"S",
			"SSW",
			"SW",
			"WSW",
			"W",
			"WNW",
			"NW",
			"NNW",
		];
		const index = Math.round(degrees / 22.5) % 16;
		return directions[index];
	};

	// Calculate arrow rotation relative to beach position (beach always at bottom)
	const getArrowRotation = (windDirection: number, spotDirection: number): number => {
		// Beach is always at bottom (180°), so spot faces up (0°)
		// Wind direction needs to be rotated relative to this beach-bottom orientation
		// If beach faces North (0°), and wind is from North (0°), arrow points down (180°)
		// If beach faces South (180°), and wind is from North (0°), arrow points up (0°)
		
		// Calculate the relative angle
		let relativeAngle = windDirection - spotDirection + 180;
		
		// Normalize to 0-360 range
		while (relativeAngle < 0) relativeAngle += 360;
		while (relativeAngle >= 360) relativeAngle -= 360;
		
		// Convert to SVG rotation (subtract 90 for SVG coordinate system)
		return relativeAngle - 90;
	};

	// Generate hourly data if not provided
	const generateHourlyWindData = (): number[] => {
		const data = [];
		for (let hour = 0; hour < 24; hour++) {
			const hourProgress = hour / 24;
			const variation =
				Math.sin(hourProgress * Math.PI * 2 + Math.PI / 4) * 30;
			data.push(
				Math.max(
					0,
					Math.min(
						360,
						windDirection + variation + (Math.random() - 0.5) * 20
					)
				)
			);
		}
		return data;
	};

	const windData = hourlyWindData || generateHourlyWindData();
	
	// Determine if this is live data
	const isLiveData = dataSource === 'live' || dataSource === 'admiralty_uk';

	return (
		<DataOverlay 
			isLiveData={isLiveData}
			dataSource={dataSource}
			className={`bg-white rounded-xl shadow-lg border-0 w-full ${className}`}
		>
			<div className="p-4">
				<div className="flex items-center justify-between mb-4">
					<h4 className="text-lg font-semibold text-gray-800">
						💨 24-Hour Wind Direction
					</h4>
					<div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-full px-3 py-1 border border-green-200">
						<div className="text-sm font-semibold text-green-700">
							Beach facing: {getCompassDirection(spotDirection)}
						</div>
					</div>
				</div>

				{/* 24-Hour Wind Direction Timeline */}
				<div className="mb-4 w-full">
					<svg
						width="100%"
						height={height}
						viewBox="0 0 100 12"
						preserveAspectRatio="none"
						className="w-full border border-gray-200 rounded"
					>
						{/* Background */}
						<rect width="100" height="12" fill="#f8fafc" rx="0.3" />

						{/* Beach/Water area - spans full width */}
						<g>
							{/* Water area - full width */}
							<rect
								x="0"
								y="8.5"
								width="100"
								height="2"
								fill="#3b82f6"
								opacity="0.2"
							/>
							{/* Beach shoreline - full width wave pattern */}
							<path
								d="M0,8.5 Q5,8 10,8.5 Q15,9 20,8.5 Q25,8 30,8.5 Q35,9 40,8.5 Q45,8 50,8.5 Q55,9 60,8.5 Q65,8 70,8.5 Q75,9 80,8.5 Q85,8 90,8.5 Q95,9 100,8.5"
								fill="none"
								stroke="#f59e0b"
								strokeWidth="0.12"
							/>
							{/* Beach sand area - full width */}
							<rect
								x="0"
								y="8.5"
								width="100"
								height="3.5"
								fill="#fbbf24"
								opacity="0.4"
							/>
						</g>

						{/* Hour markers and labels */}
						{Array.from({ length: 24 }, (_, hour) => {
							const x = 12 + (hour * 76) / 23; // Start at 12%, end at 88%
							const isMajorHour = hour % 6 === 0;

							return (
								<g key={hour}>
									{/* Vertical grid lines for major hours */}
									{isMajorHour && (
										<line
											x1={x}
											y1="1.5"
											x2={x}
											y2="9"
											stroke="#e5e7eb"
											strokeWidth="0.04"
											strokeDasharray="0.2 0.2"
											opacity="0.6"
										/>
									)}
								</g>
							);
						})}

						{/* Wind direction arrows for each hour */}
						{windData.map((windDir, hour) => {
							const x = 12 + (hour * 76) / 23;
							const windCondition = getWindCondition(
								spotDirection,
								windDir
							);

							return (
								<g key={`wind-${hour}`}>
									{/* Colored arrow showing actual wind direction relative to beach */}
									<g transform={`translate(${x}, 6)`}>
										<g
											transform={`rotate(${getArrowRotation(windDir, spotDirection)})`}
										>
											<path
												d="M0,-0.8 L0.4,0.4 L0.15,0.2 L0.15,0.8 L-0.15,0.8 L-0.15,0.2 L-0.4,0.4 Z"
												fill={windCondition.color}
												stroke="white"
												strokeWidth="0.05"
											/>
										</g>
									</g>

									{/* Compass direction text (every 4 hours) */}
									{hour % 4 === 0 && (
										<text
											x={x}
											y="2.5"
											textAnchor="middle"
											className="fill-gray-700 font-medium"
											fontSize="0.4"
										>
											{getCompassDirection(windDir)}
										</text>
									)}
								</g>
							);
						})}
					</svg>
				</div>

				{/* Enhanced time labels - show time under each point */}
				<div className="flex justify-between mt-4 px-2">
					{windData.map((windDir, hour) => {
						const windCondition = getWindCondition(
							spotDirection,
							windDir
						);

						return (
							<div key={hour} className="text-center flex-1">
								<div className="text-xs font-semibold text-gray-600">
									{hour.toString().padStart(2, "0")}:00
								</div>
								<div
									className="text-xs font-bold"
									style={{ color: windCondition.color }}
								>
									{getCompassDirection(windDir)}
								</div>
							</div>
						);
					})}
				</div>

				{/* Wind condition summary */}
				<div className="grid grid-cols-3 gap-2 text-xs mb-3">
					<div className="text-center">
						<div className="w-3 h-3 bg-green-500 rounded mx-auto mb-1"></div>
						<span className="text-gray-600">Offshore</span>
					</div>
					<div className="text-center">
						<div className="w-3 h-3 bg-amber-500 rounded mx-auto mb-1"></div>
						<span className="text-gray-600">Cross-shore</span>
					</div>
					<div className="text-center">
						<div className="w-3 h-3 bg-red-500 rounded mx-auto mb-1"></div>
						<span className="text-gray-600">Onshore</span>
					</div>
				</div>
			</div>
		</DataOverlay>
	);
}
