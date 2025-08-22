import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router";
import type { Route } from "./+types/forecast.$spotName";
import {
	getScoreColor,
	getScoreEmoji,
	getRatingColor,
} from "../utils/surfScore";
import { generateMockForecast } from "../utils/mockData";
import { useSpotFavorite } from "../hooks/useFavorites";
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
		{ title: `${spotName} 5-Day Surf Forecast - Surf Finder` },
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
	const { isFavorited, toggle } = useSpotFavorite(spotName);

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

	const handleToggleFavorite = () => {
		if (!forecast?.spot || !lat || !lng) return;

		const spotData = {
			name: forecast.spot.name,
			latitude: parseFloat(lat),
			longitude: parseFloat(lng),
			region: "UK",
		};

		toggle(spotData);
	};

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
			const currentSpotName = spotName?.replace(/-/g, " ");
			const spotData = surfSpotsData.find(
				(spot) =>
					spot.name.toLowerCase() === currentSpotName?.toLowerCase()
			);
			const mockForecast = generateMockForecast(
				spotName || "",
				lat || "0",
				lng || "0",
				spotData
			);
			setForecast(mockForecast);
		} catch (err) {
			setError("Error loading forecast data");
			console.error("Forecast error:", err);
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-white">
				<div className="px-2 md:px-4 py-8">
					<div className="text-center">
						<div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
						<p className="mt-4 text-gray-600">
							Loading 5-day surf forecast...
						</p>
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-white">
				<div className="px-2 md:px-4 py-8">
					<div className="text-center">
						<div className="bg-white border border-gray-200 p-8 inline-block">
							<div className="text-red-500 text-6xl mb-4">⚠️</div>
							<h2 className="text-xl font-semibold text-gray-800 mb-2">
								Forecast Unavailable
							</h2>
							<p className="text-gray-600 mb-6">{error}</p>
							<a
								href="/"
								className="bg-black hover:bg-gray-800 text-white px-6 py-2 border transition duration-200"
							>
								← Back to Surf Finder
							</a>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-white">
			<div className="px-2 md:px-4 py-8">
				<div className="text-center mb-8">
					<h1 className="text-4xl font-bold text-black mb-2">
						5-Day Surf Forecast
					</h1>
					<h2 className="text-2xl text-gray-800 mb-4">
						{forecast?.spot.name || spotName?.replace(/-/g, " ")}
					</h2>
					<div className="flex justify-center space-x-4 text-sm text-gray-700">
						<span>
							{lat}, {lng}
						</span>
						{forecast?.spot.skillLevel && (
							<span>{forecast.spot.skillLevel}</span>
						)}
						{forecast?.spot.breakType && (
							<span>{forecast.spot.breakType} break</span>
						)}
					</div>
					<div className="mt-6 flex justify-center space-x-3 flex-wrap">
						<button
							onClick={handleToggleFavorite}
							disabled={!forecast?.spot}
							className={`px-4 py-2 border transition duration-200 disabled:opacity-50 ${
								isFavorited
									? "bg-black hover:bg-gray-800 text-white border-black"
									: "bg-white hover:bg-gray-50 text-black border-black"
							}`}
						>
							{isFavorited ? "Favourited" : "Favourite"}
						</button>
						<a
							href="/"
							className="bg-black hover:bg-gray-800 text-white px-4 py-2 border transition duration-200"
						>
							← Surf Finder
						</a>
						<a
							href="/spots"
							className="bg-white hover:bg-gray-50 text-black px-4 py-2 border border-black transition duration-200"
						>
							All Spots
						</a>
						<a
							href="/favourites"
							className="bg-white hover:bg-gray-50 text-black px-4 py-2 border border-black transition duration-200"
						>
							Favourites
						</a>
						<button
							onClick={fetchForecast}
							disabled={loading}
							className="bg-black hover:bg-gray-800 text-white px-4 py-2 border transition duration-200 disabled:opacity-50"
						>
							Refresh
						</button>
					</div>
				</div>

				{forecast && (
					<div className="mx-auto">
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
											className={`inline-block px-3 py-1 text-sm font-medium border ${getRatingColor(day.rating)}`}
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
