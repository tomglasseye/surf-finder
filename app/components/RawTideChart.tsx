import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	ReferenceLine,
} from "recharts";

interface TideEvent {
	time: string;
	type: "high" | "low";
	height: number;
}

interface TideData {
	tideEvents: TideEvent[];
	currentTideLevel?: number;
}

interface SimpleTideChartProps {
	tideData: TideData;
	spotName: string;
}

export default function SimpleTideChart({
	tideData,
	spotName,
}: SimpleTideChartProps) {
	if (!tideData?.tideEvents || tideData.tideEvents.length === 0) {
		return (
			<div className="bg-white p-4 rounded-lg shadow-sm border">
				<h3 className="text-lg font-semibold mb-4">
					🌊 Simple Tide Chart
				</h3>
				<div className="text-gray-500">No tide data available</div>
			</div>
		);
	}

	// Create chart data by simply plotting the actual tide events
	const chartData: Array<{
		hour: number;
		tideLevel: number;
		time: string;
		isHighTide: boolean;
		isLowTide: boolean;
		eventType: string;
	}> = [];

	// Get today's events (within 24 hours)
	const now = new Date();
	const todayStart = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate()
	);
	const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

	const todaysEvents = tideData.tideEvents.filter((event) => {
		const eventTime = new Date(event.time);
		return eventTime >= todayStart && eventTime < todayEnd;
	});

	console.log("📊 Today's tide events:", todaysEvents);

	// Just plot the actual tide events - no interpolation
	todaysEvents.forEach((event) => {
		const eventTime = new Date(event.time);
		const hour = eventTime.getHours() + eventTime.getMinutes() / 60;

		chartData.push({
			hour: hour,
			tideLevel: event.height,
			time: eventTime.toLocaleTimeString("en-GB", {
				hour: "2-digit",
				minute: "2-digit",
			}),
			isHighTide: event.type === "high",
			isLowTide: event.type === "low",
			eventType: event.type,
		});
	});

	// Sort by hour
	chartData.sort((a, b) => a.hour - b.hour);

	console.log("📈 Chart data:", chartData);

	// Create hour markers for X-axis
	const hourMarkers = [];
	for (let i = 0; i <= 24; i += 3) {
		hourMarkers.push(i);
	}

	// Current time marker
	const currentHour = now.getHours() + now.getMinutes() / 60;

	return (
		<div className="bg-white p-4 rounded-lg shadow-sm border">
			<div className="flex justify-between items-center mb-4">
				<h3 className="text-lg font-semibold">🌊 Simple Tide Chart</h3>
				<div className="text-sm text-gray-600">
					{spotName} • GB UK Admiralty
				</div>
			</div>

			<div style={{ width: "100%", height: "300px" }}>
				<ResponsiveContainer>
					<LineChart
						data={chartData}
						margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
					>
						<CartesianGrid strokeDasharray="3 3" opacity={0.3} />
						<XAxis
							type="number"
							dataKey="hour"
							domain={[0, 24]}
							ticks={hourMarkers}
							tickFormatter={(hour) =>
								`${Math.floor(hour).toString().padStart(2, "0")}:00`
							}
						/>
						<YAxis
							dataKey="tideLevel"
							tickFormatter={(value) => `${value.toFixed(1)}m`}
						/>
						<Tooltip
							formatter={(
								value: number,
								name: string,
								props: any
							) => [
								`${value.toFixed(2)}m`,
								`${props.payload.eventType} tide`,
							]}
							labelFormatter={(hour: number) => {
								const h = Math.floor(hour);
								const m = Math.floor((hour - h) * 60);
								return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
							}}
						/>

						<Line
							type="linear"
							dataKey="tideLevel"
							stroke="#2563eb"
							strokeWidth={3}
							dot={{ fill: "#2563eb", strokeWidth: 2, r: 6 }}
							activeDot={{ r: 8, fill: "#1d4ed8" }}
						/>

						{/* Current time indicator */}
						<ReferenceLine
							x={currentHour}
							stroke="#ef4444"
							strokeDasharray="5 5"
							strokeWidth={2}
						/>
					</LineChart>
				</ResponsiveContainer>
			</div>

			{/* Tide events list */}
			<div className="mt-4 text-sm">
				<div className="grid grid-cols-2 gap-2">
					{todaysEvents.map((event, index) => {
						const eventTime = new Date(event.time);
						return (
							<div
								key={index}
								className={`flex justify-between p-2 rounded ${
									event.type === "high"
										? "bg-blue-50"
										: "bg-orange-50"
								}`}
							>
								<span
									className={
										event.type === "high"
											? "text-blue-700"
											: "text-orange-700"
									}
								>
									{event.type === "high"
										? "⬆️ High"
										: "⬇️ Low"}
								</span>
								<span>
									{eventTime.toLocaleTimeString("en-GB", {
										hour: "2-digit",
										minute: "2-digit",
									})}
								</span>
								<span className="font-medium">
									{event.height.toFixed(1)}m
								</span>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
