import React from "react";

interface TrafficLightData {
	hour: number;
	score: number;
	time: string;
}

interface TrafficLightChartProps {
	data?: TrafficLightData[];
	height?: number;
	className?: string;
	variant?: "default" | "compact";
}

const TrafficLightChart: React.FC<TrafficLightChartProps> = ({
	data = [],
	height = 80,
	className = "",
	variant = "default",
}) => {
	const generateHourlyData = (): TrafficLightData[] => {
		if (data && data.length > 0) {
			return data;
		}

		const hours = [];
		const now = new Date();
		const currentHour = now.getHours();

		for (let i = 0; i < 24; i++) {
			const hour = (currentHour + i) % 24;
			const time = new Date(now.getTime() + i * 60 * 60 * 1000);
			const timeString = time.toLocaleTimeString("en-GB", {
				hour: "2-digit",
				minute: "2-digit",
			});

			const mockScore = 3 + Math.sin((hour / 24) * Math.PI * 2) * 4 + Math.random() * 2;

			hours.push({
				hour,
				score: Math.max(1, Math.min(10, mockScore)),
				time: timeString,
			});
		}

		return hours;
	};

	const hourlyData = generateHourlyData();

	const getTrafficLightColor = (score: number): string => {
		if (score >= 7) return "#000000"; // Black (excellent)
		if (score >= 5) return "#6b7280"; // Gray (good)
		return "#d1d5db"; // Light gray (poor)
	};

	const getScoreLabel = (score: number): string => {
		if (score >= 7) return "Excellent";
		if (score >= 5) return "Good";
		return "Poor";
	};

	const isCompact = variant === "compact";
	const blockWidth = isCompact ? 16 : 24;
	const blockHeight = isCompact ? 16 : 24;
	const gap = isCompact ? 2 : 4;

	return (
		<div className={`bg-white border border-gray-200 p-2 md:p-4 ${className}`}>
			<div className="flex items-center justify-between mb-3">
				<h3 className={`font-semibold text-black ${isCompact ? "text-sm" : "text-base"}`}>
					24-Hour Surf Score
				</h3>
				<div className="flex items-center space-x-3 text-xs">
					<div className="flex items-center space-x-1">
						<div className="w-3 h-3 bg-gray-300"></div>
						<span className="text-gray-700">Poor</span>
					</div>
					<div className="flex items-center space-x-1">
						<div className="w-3 h-3 bg-gray-500"></div>
						<span className="text-gray-700">Good</span>
					</div>
					<div className="flex items-center space-x-1">
						<div className="w-3 h-3 bg-black"></div>
						<span className="text-gray-700">Excellent</span>
					</div>
				</div>
			</div>

			<div className="relative" style={{ height: `${height}px` }}>
				<div className="flex items-end justify-between h-full">
					{hourlyData.map((dataPoint, index) => {
						const color = getTrafficLightColor(dataPoint.score);
						const opacity = Math.max(0.3, dataPoint.score / 10);
						
						return (
							<div
								key={index}
								className="group relative flex flex-col items-center"
								style={{ width: `${blockWidth}px` }}
							>
								<div
									className="rounded-full transition-all duration-200 hover:scale-110 cursor-pointer"
									style={{
										width: `${blockWidth}px`,
										height: `${blockHeight}px`,
										backgroundColor: color,
										opacity: opacity,
									}}
									title={`${dataPoint.time}: ${dataPoint.score.toFixed(1)}/10 (${getScoreLabel(dataPoint.score)})`}
								/>
								
								{isCompact ? (
									index % 4 === 0 && (
										<div className="text-xs text-gray-500 mt-1 absolute -bottom-6">
											{dataPoint.hour.toString().padStart(2, "0")}
										</div>
									)
								) : (
									index % 2 === 0 && (
										<div className="text-xs text-gray-500 mt-1 absolute -bottom-6">
											{dataPoint.hour.toString().padStart(2, "0")}:00
										</div>
									)
								)}

								<div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10 pointer-events-none transition-opacity">
									{dataPoint.time}: {dataPoint.score.toFixed(1)}/10
									<div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-800"></div>
								</div>
							</div>
						);
					})}
				</div>
			</div>

			<div className="mt-6 text-center">
				<div className="text-xs text-gray-700">
					Hover over circles to see detailed scores • Times shown in local time
				</div>
			</div>
		</div>
	);
};

export default TrafficLightChart;