import {
	ResponsiveContainer,
	ComposedChart,
	Line,
	Area,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ReferenceLine,
	Scatter,
} from "recharts";
import DataOverlay from "./DataOverlay";

interface HourlyData {
	waveHeight: number[];
	period: number[];
	windSpeed: number[];
	windDirection?: number[];
	times: string[];
}

interface ProfessionalHourlyChartProps {
	data?: HourlyData | null;
	height?: number;
	className?: string;
	variant?: "full" | "compact";
	date?: Date;
	dataSource?: string;
}

export default function ProfessionalHourlyChart({
	data,
	height = 150,
	className = "",
	variant = "full",
	date,
	dataSource = "unknown",
}: ProfessionalHourlyChartProps) {
	// Helper function to convert wind direction to compass
	const getWindDirectionText = (degrees: number): string => {
		if (degrees === null || degrees === undefined) return "N/A";

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
	// Generate mock data if no real data provided
	const generateMockData = (): HourlyData => {
		const times = [];
		const waveHeight = [];
		const period = [];
		const windSpeed = [];
		const windDirection = [];

		const baseDate = date || new Date();
		const startOfDay = new Date(
			baseDate.getFullYear(),
			baseDate.getMonth(),
			baseDate.getDate()
		);

		for (let hour = 0; hour < 24; hour++) {
			const time = new Date(startOfDay.getTime() + hour * 3600000);
			times.push(time.toISOString());

			// Generate realistic surf data curves
			const dayProgress = hour / 24;
			const waveBase =
				0.8 + Math.sin(dayProgress * Math.PI * 2 + Math.PI / 3) * 0.6;
			const periodBase =
				8 + Math.sin(dayProgress * Math.PI * 2 + Math.PI / 2) * 3;
			const windBase =
				5 + Math.sin(dayProgress * Math.PI * 2) * 8 + Math.random() * 3;
			const windDirBase =
				180 + Math.sin(dayProgress * Math.PI * 2 + Math.PI / 4) * 60; // SW varying to W/NW

			waveHeight.push(Math.max(0.2, waveBase + Math.random() * 0.4));
			period.push(Math.max(4, periodBase + Math.random() * 2));
			windSpeed.push(Math.max(0, windBase));
			windDirection.push(
				Math.max(0, Math.min(360, windDirBase + Math.random() * 40))
			);
		}

		return { waveHeight, period, windSpeed, windDirection, times };
	};

	const surfData = data || generateMockData();

	// Debug: Check if we have real data
	const hasRealData = data && data.times && data.times.length > 0;

	// Transform data for Recharts with unit conversions
	let chartData: any[] = [];
	try {
		chartData = (
			surfData?.times && Array.isArray(surfData.times)
				? surfData.times
				: []
		).map((time, index) => {
			// Handle time parsing - could be ISO string or hour string like '00:00'
			let timeObj;
			let hourValue;

			if (time.includes("T") || time.includes("Z") || time.length > 8) {
				// Full ISO string format like "2025-08-23T15:00:00.000Z"
				timeObj = new Date(time);
				hourValue = timeObj.getHours();
			} else if (time.includes(":")) {
				// Simple time format like '00:00' - extract hour
				hourValue = parseInt(time.split(":")[0]);
				timeObj = new Date();
				timeObj.setHours(hourValue, 0, 0, 0);
			} else {
				// Fallback - assume it's a number
				hourValue = parseInt(time) || 0;
				timeObj = new Date();
				timeObj.setHours(hourValue, 0, 0, 0);
			}

			const windDir = surfData.windDirection?.[index];
			const transformedData = {
				time: hourValue,
				timeLabel: `${hourValue.toString().padStart(2, "0")}:00`,
				waveHeight: parseFloat(
					((surfData?.waveHeight?.[index] || 0) * 3.28084).toFixed(1)
				), // Convert m to ft
				period: parseFloat(
					surfData?.period?.[index]?.toFixed(1) || "0"
				),
				windSpeed: parseFloat(
					((surfData?.windSpeed?.[index] || 0) * 0.621371).toFixed(1)
				), // Convert km/h to mph
				windDirection: windDir,
				windDirectionText:
					windDir !== undefined
						? getWindDirectionText(windDir)
						: "N/A",
				isNow: hourValue === new Date().getHours(),
			};

			return transformedData;
		});
	} catch (error) {
		console.error("📊 Error transforming chart data:", error);
		chartData = [];
	}

	// Ensure we have valid data
	if (chartData.length === 0) {
		console.error("📊 No chart data generated!");
		return <div className="text-red-500 p-4">No chart data available</div>;
	}

	// Custom tooltip
	const CustomTooltip = ({ active, payload, label }: any) => {
		if (active && payload && payload.length) {
			const data = payload[0]?.payload;

			// Filter to only show the metrics we want
			const wantedMetrics = ["Wave Height", "Period", "Wind Speed"];
			const filteredPayload = payload.filter((entry: any) =>
				wantedMetrics.includes(entry.name)
			);

			return (
				<div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
					<p className="font-semibold text-gray-800">{`${label}:00`}</p>
					{filteredPayload &&
						Array.isArray(filteredPayload) &&
						filteredPayload.map((entry: any, index: number) => (
							<p
								key={index}
								style={{ color: entry.color }}
								className="text-sm"
							>
								{`${entry.name}: ${entry.value}${entry.name === "Wave Height" ? "ft" : entry.name === "Period" ? "s" : " mph"}`}
							</p>
						))}
					{data?.windDirectionText && (
						<p className="text-sm text-orange-600">
							{`Wind Direction: ${data.windDirectionText}`}
						</p>
					)}
				</div>
			);
		}
		return null;
	};

	// Current hour for reference line
	const currentHour = new Date().getHours();

	// Determine if this is live data - enhanced_calculation is acceptable fallback
	const isLiveData =
		dataSource === "live" ||
		dataSource === "admiralty_uk" ||
		dataSource === "enhanced_calculation";

	return (
		<DataOverlay
			isLiveData={isLiveData}
			dataSource={dataSource}
			className={`bg-white rounded-xl shadow-lg border-0 ${className}`}
		>
			<div className="p-4">
				{variant === "full" && (
					<div className="mb-4">
						<h4 className="text-lg font-semibold text-gray-800 text-center">
							📊 Hourly Surf Conditions{" "}
							{date
								? `- ${date.toLocaleDateString("en-GB", { weekday: "short", month: "short", day: "numeric" })}`
								: ""}
						</h4>
					</div>
				)}

				<div style={{ height: `${height}px` }}>
					<ResponsiveContainer width="100%" height="100%">
						<ComposedChart
							data={chartData}
							margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
						>
							<defs>
								<linearGradient
									id="waveGradient"
									x1="0"
									y1="0"
									x2="0"
									y2="1"
								>
									<stop
										offset="0%"
										stopColor="#3b82f6"
										stopOpacity={0.8}
									/>
									<stop
										offset="100%"
										stopColor="#3b82f6"
										stopOpacity={0.1}
									/>
								</linearGradient>
								<linearGradient
									id="periodGradient"
									x1="0"
									y1="0"
									x2="0"
									y2="1"
								>
									<stop
										offset="0%"
										stopColor="#8b5cf6"
										stopOpacity={0.6}
									/>
									<stop
										offset="100%"
										stopColor="#8b5cf6"
										stopOpacity={0.1}
									/>
								</linearGradient>
							</defs>

							<CartesianGrid
								strokeDasharray="3 3"
								stroke="#e5e7eb"
								opacity={0.5}
							/>

							<XAxis
								dataKey="time"
								tickFormatter={(value) => `${value}:00`}
								stroke="#6b7280"
								fontSize={12}
								interval="preserveStartEnd"
							/>

							<YAxis
								yAxisId="left"
								stroke="#3b82f6"
								fontSize={12}
								domain={[0, "dataMax + 1"]}
								label={{
									value: "Wave Height (ft)",
									angle: -90,
									position: "insideLeft",
									style: { textAnchor: "middle" },
								}}
							/>

							<YAxis
								yAxisId="right"
								orientation="right"
								stroke="#8b5cf6"
								fontSize={12}
								domain={[0, "dataMax + 2"]}
								label={{
									value: "Period (s) / Wind (mph)",
									angle: 90,
									position: "insideRight",
									style: { textAnchor: "middle" },
								}}
							/>

							{/* Current time reference line */}
							<ReferenceLine
								x={currentHour}
								stroke="#ef4444"
								strokeDasharray="4 4"
								opacity={0.8}
							/>

							{/* Wave Height Area */}
							<Area
								yAxisId="left"
								type="monotone"
								dataKey="waveHeight"
								stroke="#1e40af"
								strokeWidth={3}
								fill="url(#waveGradient)"
								name="Wave Height"
							/>

							{/* Period Line */}
							<Line
								yAxisId="right"
								type="monotone"
								dataKey="period"
								stroke="#7c3aed"
								strokeWidth={2.5}
								strokeDasharray="6 3"
								dot={{ fill: "#8b5cf6", strokeWidth: 2, r: 3 }}
								name="Period"
							/>

							{/* Wind Speed Line */}
							<Line
								yAxisId="right"
								type="monotone"
								dataKey="windSpeed"
								stroke="#059669"
								strokeWidth={2}
								strokeDasharray="3 2"
								dot={{ fill: "#10b981", strokeWidth: 2, r: 2 }}
								name="Wind Speed"
							/>

							{/* Wind Direction Scatter Points */}
							{surfData.windDirection && (
								<Scatter
									yAxisId="right"
									dataKey="windSpeed"
									fill="#f59e0b"
									shape={(props: any) => {
										const { cx, cy, payload } = props;
										if (!payload?.windDirection) {
											return (
												<circle
													r={0}
													fill="transparent"
												/>
											);
										}

										// Convert wind direction to rotation angle (wind direction is "from" direction)
										const rotation =
											payload.windDirection + 180; // Add 180 to show where wind is going

										return (
											<g
												transform={`translate(${cx}, ${cy})`}
											>
												{/* Wind direction arrow */}
												<g
													transform={`rotate(${rotation})`}
												>
													<path
														d="M0,-6 L3,0 L0,6 L-3,0 Z"
														fill="#f59e0b"
														stroke="#d97706"
														strokeWidth={0.5}
													/>
												</g>
												{/* Small circle base */}
												<circle
													r={1.5}
													fill="#f59e0b"
													stroke="#d97706"
													strokeWidth={0.5}
												/>
											</g>
										);
									}}
									name="Wind Direction"
								/>
							)}

							<Tooltip content={<CustomTooltip />} />

							{variant === "full" && (
								<Legend
									wrapperStyle={{ paddingTop: "20px" }}
									iconType="line"
								/>
							)}
						</ComposedChart>
					</ResponsiveContainer>
				</div>

				{/* Enhanced current values display */}
				{/* <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3"> */}
				{/* Wave Height Card */}
				{/* <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm"></div>
              <span className="text-xs font-semibold text-blue-800">Wave Height</span>
            </div>
            <div className="text-lg font-bold text-blue-600">
              {surfData.waveHeight[new Date().getHours()] ? 
                `${(surfData.waveHeight[new Date().getHours()] * 3.28084).toFixed(1)}ft` : 
                `${(surfData.waveHeight[12] * 3.28084).toFixed(1)}ft`}
            </div>
            <div className="text-xs text-blue-600">
              Peak: {(Math.max(...surfData.waveHeight) * 3.28084).toFixed(1)}ft
            </div>
          </div> */}

				{/* Period Card */}
				{/* <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-3 border border-purple-200 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-1 bg-purple-500 rounded shadow-sm"></div>
              <span className="text-xs font-semibold text-purple-800">Period</span>
            </div>
            <div className="text-lg font-bold text-purple-600">
              {surfData.period[new Date().getHours()] ? 
                `${surfData.period[new Date().getHours()].toFixed(1)}s` : 
                `${surfData.period[12].toFixed(1)}s`}
            </div>
            <div className="text-xs text-purple-600">
              Best: {Math.max(...surfData.period).toFixed(1)}s
            </div>
          </div> */}

				{/* Wind Speed Card */}
				{/* <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-3 border border-green-200 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-1 bg-green-500 rounded shadow-sm"></div>
              <span className="text-xs font-semibold text-green-800">Wind Speed</span>
            </div>
            <div className="text-lg font-bold text-green-600">
              {surfData.windSpeed[new Date().getHours()] ? 
                `${(surfData.windSpeed[new Date().getHours()] * 0.621371).toFixed(1)} mph` : 
                `${(surfData.windSpeed[12] * 0.621371).toFixed(1)} mph`}
            </div>
            <div className="text-xs text-green-600">
              Max: {(Math.max(...surfData.windSpeed) * 0.621371).toFixed(1)} mph
            </div>
          </div> */}
				{/* </div> */}

				{/* Remove the manual demo data notice since DataOverlay handles this */}
			</div>
		</DataOverlay>
	);
}
