import React from "react";
import { calculateSurfScore } from "../utils/surfScore";
import DataOverlay from "./DataOverlay";

interface TrafficLightData {
	hour: number;
	score: number;
	time: string;
}

interface SpotPreferences {
	bestTide?: string;
	optimalWindDir?: number[];
	optimalSwellDir?: number[];
}

interface TrafficLightChartProps {
	data?: TrafficLightData[];
	height?: number;
	className?: string;
	variant?: "default" | "compact";
	spotPreferences?: SpotPreferences;
	hourlyData?: any[];
	dataSource?: string;
}

const TrafficLightChart: React.FC<TrafficLightChartProps> = ({
	data = [],
	height = 80,
	className = "",
	variant = "default",
	spotPreferences,
	hourlyData,
	dataSource = "unknown",
}) => {
	const generateHourlyData = (): TrafficLightData[] => {
		if (data && data.length > 0) {
			return data;
		}

		// If we have real hourly data and spot preferences, calculate real scores
		if (
			hourlyData &&
			Array.isArray(hourlyData) &&
			spotPreferences &&
			hourlyData.length > 0
		) {
			return hourlyData
				.map((hourData) => {
					// Ensure hourData is valid
					if (!hourData || typeof hourData !== "object") {
						return null;
					}
					const conditions = {
						waveHeight: hourData.waveHeight || 1.2,
						period: hourData.period || 8,
						windSpeed: hourData.windSpeed || 10,
						windDirection: hourData.windDirection || 225,
						swellDirection: hourData.swellDirection || 270,
						tideLevel: hourData.tideLevel || 0.5, // This is the key tide integration
					};

					const score = calculateSurfScore(
						conditions,
						spotPreferences
					);

					return {
						hour: hourData.hour || 0,
						score: score,
						time:
							hourData.time ||
							`${(hourData.hour || 0).toString().padStart(2, "0")}:00`,
					};
				})
				.filter((item) => item !== null); // Remove any null entries
		}

		// Fallback to mock data
		const hours = [];
		const now = new Date();

		// Start from midnight (00:00) to arrange hours with midday in the middle
		for (let i = 0; i < 24; i++) {
			const hour = i; // Hours from 0 to 23
			const time = new Date();
			time.setHours(hour, 0, 0, 0);
			const timeString = time.toLocaleTimeString("en-GB", {
				hour: "2-digit",
				minute: "2-digit",
			});

			const mockScore =
				3 + Math.sin((hour / 24) * Math.PI * 2) * 4 + Math.random() * 2;

			hours.push({
				hour,
				score: Math.max(1, Math.min(10, mockScore)),
				time: timeString,
			});
		}

		return hours;
	};

	const trafficLightData = generateHourlyData();

	const getTrafficLightColor = (score: number): string => {
		if (score >= 7) return "#10b981"; // Green (excellent)
		if (score >= 5) return "#f59e0b"; // Orange (good)
		return "#ef4444"; // Red (poor)
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

	// Determine if this is live data - enhanced_calculation is acceptable fallback
	const isLiveData =
		dataSource === "live" ||
		dataSource === "admiralty_uk" ||
		dataSource === "enhanced_calculation";

	return (
		<DataOverlay
			isLiveData={isLiveData}
			dataSource={dataSource}
			className={`bg-white border border-gray-200 p-2 md:p-4 ${className}`}
		>
			<div className="flex items-center justify-between mb-3">
				<h3
					className={`font-semibold text-black ${isCompact ? "text-sm" : "text-base"}`}
				>
					24-Hour Surf Score
				</h3>
				<div className="flex items-center space-x-3 text-xs">
					<div className="flex items-center space-x-1">
						<div className="w-3 h-3 bg-red-500 rounded"></div>
						<span className="text-gray-700">Poor</span>
					</div>
					<div className="flex items-center space-x-1">
						<div className="w-3 h-3 bg-amber-500 rounded"></div>
						<span className="text-gray-700">Good</span>
					</div>
					<div className="flex items-center space-x-1">
						<div className="w-3 h-3 bg-green-500 rounded"></div>
						<span className="text-gray-700">Excellent</span>
					</div>
				</div>
			</div>

			<div className="relative" style={{ height: `${height}px` }}>
				<div className="flex items-end justify-between h-full">
					{trafficLightData.map((dataPoint, index) => {
						const score = dataPoint?.score || 0;
						const color = getTrafficLightColor(score);
						const opacity = Math.max(0.3, score / 10);

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
									title={`${dataPoint?.time || "00:00"}: ${score.toFixed(1)}/10 (${getScoreLabel(score)})`}
								/>

								<div className="text-xs text-gray-500 mt-1 absolute -bottom-6">
									{isCompact
										? dataPoint.hour
												.toString()
												.padStart(2, "0")
										: `${dataPoint.hour
												.toString()
												.padStart(2, "0")}:00`}
								</div>

								<div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10 pointer-events-none transition-opacity">
									{dataPoint?.time || "00:00"}:{" "}
									{score.toFixed(1)}/10
									<div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-800"></div>
								</div>
							</div>
						);
					})}
				</div>
			</div>

			<div className="mt-6 text-center">
				<div className="text-xs text-gray-700">
					Hover over circles to see detailed scores • Times shown in
					local time
				</div>
			</div>
		</DataOverlay>
	);
};

export default TrafficLightChart;
