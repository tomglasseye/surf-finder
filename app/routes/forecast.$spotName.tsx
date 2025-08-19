import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router";
import type { Route } from "./+types/forecast.$spotName";
import TideGraph from "../components/TideGraph";
import HourlySurfChart from "../components/HourlySurfChart";
import ProfessionalTideChart from "../components/ProfessionalTideChart";
import ProfessionalHourlyChart from "../components/ProfessionalHourlyChart";
import BestTimeDisplay from "../components/BestTimeDisplay";
import TrafficLightChart from "../components/TrafficLightChart";
import surfSpotsData from "../data/surfSpots.json";

export function meta({ params }: Route.MetaArgs) {
	const spotName = params.spotName?.replace(/-/g, " ") || "Surf Spot";
	return [
		{ title: `${spotName} 5-Day Surf Forecast - UK Surf Finder` },
		{
			name: "description",
			content: `5-day surf forecast for ${spotName} with detailed wave conditions and scores`,
		},
	];
}

interface TideData {
	currentLevel: number;
	isRising: boolean;
	nextHigh: Date;
	nextLow: Date;
}

interface BestTimeData {
	bestTime: {
		hour: number;
		score: number;
		factors: string[];
		time: string;
	};
	bestWindow?: {
		start: number;
		end: number;
		startTime: string;
		endTime: string;
		hasGoodLight?: boolean;
	} | null;
	allHours: Array<{
		hour: number;
		score: number;
		factors: string[];
		time: string;
	}>;
}

interface ForecastDay {
	date: string;
	dayName: string;
	dateStr: string;
	score: number;
	waveHeight: number;
	period: number;
	windSpeed: number;
	factors: string[];
	rating: string;
	tideData?: TideData;
	bestTime?: BestTimeData;
}

interface ForecastData {
	spot: {
		name: string;
		latitude: number;
		longitude: number;
		skillLevel?: string;
		breakType?: string;
		reliability?: string;
	};
	forecast: ForecastDay[];
	timestamp: string;
}

export default function ForecastSpot() {
	const { spotName } = useParams();
	const [searchParams] = useSearchParams();
	const [forecast, setForecast] = useState<ForecastData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	const lat = searchParams.get("lat");
	const lng = searchParams.get("lng");

	useEffect(() => {
		if (!lat || !lng) {
			setError("Location coordinates are required");
			setLoading(false);
			return;
		}

		fetchForecast();
	}, [lat, lng, spotName]);

	const fetchForecast = async () => {
		try {
			setLoading(true);
			setError("");

			try {
				const response = await fetch(
					`/.netlify/functions/get-forecast?lat=${lat}&lng=${lng}&spotName=${spotName}`
				);
				const data = await response.json();

				if (response.ok) {
					setForecast(data);
					return;
				}
			} catch (networkError) {
				console.log("Netlify function not available, using mock data");
			}

			// Fallback: Generate mock 5-day forecast for development
			const mockForecast = generateMockForecast();
			setForecast(mockForecast);
		} catch (err) {
			setError("Error loading forecast data");
			console.error("Forecast error:", err);
		} finally {
			setLoading(false);
		}
	};

	const generateMockForecast = () => {
		const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
		const mockSeed = parseFloat(lat || "0") + parseFloat(lng || "0"); // Use location as seed
		const seededRandom = (seed: number) => {
			const x = Math.sin(seed) * 10000;
			return x - Math.floor(x);
		};

		// Find the actual spot data to use optimal conditions
		const currentSpotName = spotName?.replace(/-/g, " ");
		const spotData = surfSpotsData.find(
			(spot) => spot.name.toLowerCase() === currentSpotName?.toLowerCase()
		);

		const forecast = days.map((day, index) => {
			const daySeed = mockSeed + index * 41; // Consistent seed per day
			const waveHeight = 0.5 + seededRandom(daySeed * 1.3) * 2; // 0.5-2.5m
			const period = 6 + seededRandom(daySeed * 1.5) * 8; // 6-14s
			const windSpeed = seededRandom(daySeed * 1.7) * 25; // 0-25 km/h
			const windDirection = 90 + seededRandom(daySeed * 2.1) * 180; // 90-270 degrees
			const swellDirection = 270 + seededRandom(daySeed * 2.3) * 90; // 270-360 degrees

			// Mock tide data for consistency
			const tideLevel = seededRandom(daySeed * 2.7); // 0-1 scale
			const tideRising = seededRandom(daySeed * 3.1) > 0.5;

			/**
			 * Calculates the surf forecast score for a given day using mock data and spot preferences.
			 *
			 * The score is based on the following attributes:
			 * - Wave height (optimal: 1–1.8m, max 3 points)
			 * - Wave period (optimal: 10–14s, max 2 points)
			 * - Wind direction (matches spot's optimal wind directions, max 1.5 points)
			 * - Swell direction (matches spot's optimal swell directions, max 1.5 points)
			 * - Tide level (matches spot's best tide, max 1 point)
			 * - Wind speed (lower is better, max 1 point)
			 *
			 * There is no base score; only near-perfect conditions can reach a score close to 10.
			 *
			 * @returns {number} The calculated score, clamped between 1.0 and 10.0.
			 */
			const calculateForecastScore = () => {
				// Wave height (max 3)
				let heightScore = 0;
				if (waveHeight >= 1 && waveHeight <= 1.8) heightScore = 3;
				else if (waveHeight >= 0.8 && waveHeight < 1) heightScore = 2;
				else if (waveHeight > 1.8 && waveHeight <= 2.2) heightScore = 2;
				else if (waveHeight > 0.5 && waveHeight < 0.8) heightScore = 1;
				else heightScore = 0;

				// Period (max 2)
				let periodScore = 0;
				if (period >= 10 && period <= 14) periodScore = 2;
				else if (period >= 8 && period < 10) periodScore = 1;
				else periodScore = 0;

				// Wind direction (max 1.5)
				let windScore = 0;
				if (spotData?.optimalWindDir?.length) {
					const windMatches = spotData.optimalWindDir.some(
						(optimalDir) => {
							const diff = Math.abs(windDirection - optimalDir);
							const angleDiff = Math.min(diff, 360 - diff);
							return angleDiff <= 45;
						}
					);
					windScore = windMatches ? 1.5 : 0;
				}

				// Swell direction (max 1.5)
				let swellScore = 0;
				if (spotData?.optimalSwellDir?.length) {
					const swellMatches = spotData.optimalSwellDir.some(
						(optimalDir) => {
							const diff = Math.abs(swellDirection - optimalDir);
							const angleDiff = Math.min(diff, 360 - diff);
							return angleDiff <= 30;
						}
					);
					swellScore = swellMatches ? 1.5 : 0;
				}

				// Tide (max 1)
				let tideScore = 0;
				if (spotData?.bestTide) {
					const currentTidePercent = tideLevel * 100;
					switch (spotData.bestTide.toLowerCase()) {
						case "low":
							tideScore = currentTidePercent < 30 ? 1 : 0;
							break;
						case "mid":
							tideScore =
								currentTidePercent >= 30 &&
								currentTidePercent <= 70
									? 1
									: 0;
							break;
						case "high":
							tideScore = currentTidePercent > 70 ? 1 : 0;
							break;
						default:
							tideScore = 0.2;
					}
				}

				// Wind speed (max 1)
				let windSpeedScore = 0;
				if (windSpeed < 5) windSpeedScore = 1;
				else if (windSpeed < 15) windSpeedScore = 0.5;
				else windSpeedScore = 0;

				// Total max score: 10
				const score =
					heightScore +
					periodScore +
					windScore +
					swellScore +
					tideScore +
					windSpeedScore;
				return Math.min(Math.max(score, 1.0), 10.0);
			};

			const score = calculateForecastScore();

			// Generate more intelligent factors based on conditions
			const factors = [
				"🔄 Mock data for development",
				score > 7
					? "Excellent wave conditions"
					: score > 5
						? "Good surf potential"
						: score > 3
							? "Average conditions"
							: "Poor conditions",
				period > 10
					? "Clean groundswell"
					: period > 8
						? "Good wave period"
						: "Moderate period",
				spotData && windScore > 0
					? "Favorable wind direction"
					: spotData && windScore < 0
						? "Challenging wind direction"
						: "Variable wind",
				spotData && swellScore > 0
					? "Optimal swell angle"
					: spotData && swellScore < 0
						? "Suboptimal swell angle"
						: "Mixed swell conditions",
			]
				.filter((factor) => factor.length > 0)
				.slice(0, 3); // Keep top 3 most relevant factors

			const date = new Date();
			date.setDate(date.getDate() + index);

			return {
				date: date.toISOString().split("T")[0],
				dayName: day,
				dateStr: date.toLocaleDateString("en-GB", {
					month: "short",
					day: "numeric",
				}),
				score: Math.round(score * 10) / 10,
				waveHeight: Math.round(waveHeight * 10) / 10,
				period: Math.round(period * 10) / 10,
				windSpeed: Math.round(windSpeed * 10) / 10,
				factors: factors,
				rating:
					score >= 7
						? "Excellent"
						: score >= 5.5
							? "Good"
							: score >= 4
								? "Average"
								: "Poor",
				tideData: {
					currentLevel: tideLevel,
					isRising: tideRising,
					nextHigh: new Date(
						Date.now() + (tideRising ? 3 : 9) * 3600000
					), // 3-9 hours from now
					nextLow: new Date(
						Date.now() + (tideRising ? 9 : 3) * 3600000
					),
				},
			};
		});

		return {
			spot: {
				name: spotName?.replace(/-/g, " ") || "Unknown Spot",
				latitude: parseFloat(lat || "0"),
				longitude: parseFloat(lng || "0"),
				skillLevel: spotData?.skillLevel || "Intermediate",
				breakType: spotData?.breakType || "beach",
				reliability: spotData?.reliability || "Consistent",
				...(spotData && {
					optimalSwellDir: spotData.optimalSwellDir,
					optimalWindDir: spotData.optimalWindDir,
					bestTide: spotData.bestTide,
					bestConditions: spotData.bestConditions,
				}),
			},
			forecast,
			timestamp: new Date().toISOString(),
		};
	};

	const getScoreColor = (score: number) => {
		if (score >= 7) return "text-green-600 font-bold";
		if (score >= 5.5) return "text-green-500";
		if (score >= 4) return "text-yellow-500";
		if (score >= 2) return "text-orange-500";
		return "text-red-500";
	};

	const getScoreEmoji = (score: number) => {
		if (score >= 7) return "🔥";
		if (score >= 5.5) return "🌊";
		if (score >= 4) return "👍";
		if (score >= 2) return "⚠️";
		return "💤";
	};

	const getRatingColor = (rating: string) => {
		switch (rating) {
			case "Excellent":
				return "bg-green-100 text-green-800 border-green-200";
			case "Good":
				return "bg-blue-100 text-blue-800 border-blue-200";
			case "Average":
				return "bg-yellow-100 text-yellow-800 border-yellow-200";
			case "Poor":
				return "bg-orange-100 text-orange-800 border-orange-200";
			case "Very Poor":
				return "bg-red-100 text-red-800 border-red-200";
			default:
				return "bg-gray-100 text-gray-800 border-gray-200";
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center">
				<div className="text-center">
					<div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
					<p className="mt-4 text-gray-600">
						Loading 5-day surf forecast...
					</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center">
				<div className="text-center bg-white rounded-lg shadow-lg p-8 max-w-md">
					<div className="text-red-500 text-6xl mb-4">⚠️</div>
					<h2 className="text-xl font-semibold text-gray-800 mb-2">
						Forecast Unavailable
					</h2>
					<p className="text-gray-600 mb-6">{error}</p>
					<a
						href="/"
						className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition duration-200"
					>
						← Back to Surf Finder
					</a>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100">
			<div className="container mx-auto px-4 py-8">
				<div className="text-center mb-8">
					<h1 className="text-4xl font-bold text-gray-800 mb-2">
						🌊 5-Day Surf Forecast
					</h1>
					<h2 className="text-2xl text-gray-600 mb-4">
						{forecast?.spot.name || spotName?.replace(/-/g, " ")}
					</h2>
					<div className="flex justify-center space-x-4 text-sm text-gray-600">
						<span>
							📍 {lat}, {lng}
						</span>
						{forecast?.spot.skillLevel && (
							<span>🏄‍♂️ {forecast.spot.skillLevel}</span>
						)}
						{forecast?.spot.breakType && (
							<span>🌊 {forecast.spot.breakType} break</span>
						)}
					</div>
					<div className="mt-6 flex justify-center space-x-3">
						<a
							href="/"
							className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200"
						>
							← Surf Finder
						</a>
						<a
							href="/spots"
							className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition duration-200"
						>
							📋 All Spots
						</a>
						<button
							onClick={fetchForecast}
							disabled={loading}
							className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition duration-200 disabled:opacity-50"
						>
							🔄 Refresh
						</button>
					</div>
				</div>

				{forecast && (
					<div className="max-w-6xl mx-auto">
						<div className="space-y-6">
							{forecast.forecast.map((day, index) => (
								<div
									key={day.date}
									className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-200"
								>
									<div className="text-center mb-4">
										<h3 className="text-lg font-semibold text-gray-800">
											{day.dayName}
										</h3>
										<p className="text-gray-600 text-sm">
											{day.dateStr}
										</p>
										{index === 0 && (
											<span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mt-1">
												Today
											</span>
										)}
									</div>

									<div className="text-center mb-4">
										<div
											className={`text-3xl ${getScoreColor(day.score)} mb-2`}
										>
											{getScoreEmoji(day.score)}{" "}
											{day.score}/10
										</div>
										<div
											className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getRatingColor(day.rating)}`}
										>
											{day.rating}
										</div>
									</div>

									<div className="space-y-3 mb-4">
										<div className="bg-blue-50 rounded-lg p-3">
											<div className="text-gray-600 text-sm">
												Wave Height
											</div>
											<div className="font-semibold text-blue-600">
												{(
													day.waveHeight * 3.28084
												).toFixed(1)}
												ft
											</div>
										</div>

										<div className="bg-purple-50 rounded-lg p-3">
											<div className="text-gray-600 text-sm">
												Period
											</div>
											<div className="font-semibold text-purple-600">
												{day.period.toFixed(1)}s
											</div>
										</div>

										<div className="bg-green-50 rounded-lg p-3">
											<div className="text-gray-600 text-sm">
												Wind Speed
											</div>
											<div className="font-semibold text-green-600">
												{(
													day.windSpeed * 0.621371
												).toFixed(1)}{" "}
												mph
											</div>
										</div>
									</div>

									{/* Traffic Light Score Chart */}
									<div className="mb-4">
										<TrafficLightChart
											height={60}
											variant="compact"
											className="border-0"
										/>
									</div>

									{/* Daily Tide Chart */}
									<div className="mb-4">
										<ProfessionalTideChart
											tideData={day.tideData}
											variant="daily"
											height={150}
											showHours={24}
											className="border-0"
											latitude={forecast.spot.latitude}
											longitude={forecast.spot.longitude}
											date={new Date(day.date)}
										/>
									</div>

									{/* Hourly Surf Conditions Chart */}
									<div className="mb-4">
										<ProfessionalHourlyChart
											data={day.hourlyData}
											height={180}
											className="border-0"
											variant="compact"
											date={new Date(day.date)}
										/>
									</div>

									{/* Best Time Display for this day */}
									{day.bestTime && (
										<div className="mb-4">
											<BestTimeDisplay
												bestTimeData={day.bestTime}
												variant="compact"
												className="border-0"
											/>
										</div>
									)}

									{day.factors.length > 0 && (
										<div className="border-t pt-3">
											<div className="text-xs text-gray-600 mb-2">
												Key Factors:
											</div>
											<div className="space-y-1">
												{day.factors.map(
													(factor, idx) => (
														<div
															key={idx}
															className="text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded"
														>
															• {factor}
														</div>
													)
												)}
											</div>
										</div>
									)}
								</div>
							))}
						</div>

						<div className="mt-8 bg-white rounded-lg shadow-lg p-6">
							<h3 className="text-lg font-semibold text-gray-800 mb-4">
								📊 5-Day Overview
							</h3>

							<div className="grid gap-4 md:grid-cols-3">
								<div className="text-center">
									<div className="text-2xl font-bold text-green-600">
										{
											forecast.forecast.filter(
												(d) => d.score >= 5.5
											).length
										}
									</div>
									<div className="text-gray-600 text-sm">
										Good+ Days
									</div>
								</div>

								<div className="text-center">
									<div className="text-2xl font-bold text-blue-600">
										{(
											Math.max(
												...forecast.forecast.map(
													(d) => d.waveHeight
												)
											) * 3.28084
										).toFixed(1)}
										ft
									</div>
									<div className="text-gray-600 text-sm">
										Peak Wave Height
									</div>
								</div>

								<div className="text-center">
									<div className="text-2xl font-bold text-purple-600">
										{Math.max(
											...forecast.forecast.map(
												(d) => d.period
											)
										).toFixed(1)}
										s
									</div>
									<div className="text-gray-600 text-sm">
										Best Period
									</div>
								</div>
							</div>
						</div>

						<div className="mt-6 text-center text-sm text-gray-500">
							Last updated:{" "}
							{new Date(forecast.timestamp).toLocaleString(
								"en-GB"
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
