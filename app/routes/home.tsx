import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/home";
import surfSpotsData from "../data/surfSpots.json";
import { getScoreColor, getScoreEmoji } from "../utils/surfScore";
import { createEnrichedSpot } from "../utils/mockData";
import { useFavorites } from "../hooks/useFavorites";
import TideGraph from "../components/TideGraph";
import HourlySurfChart from "../components/HourlySurfChart";
import ProfessionalTideChart from "../components/ProfessionalTideChart";
import ProfessionalHourlyChart from "../components/ProfessionalHourlyChart";
import BestTimeDisplay from "../components/BestTimeDisplay";
import TrafficLightChart from "../components/TrafficLightChart";

export function meta({}: Route.MetaArgs) {
	return [
		{ title: "Surf Finder" },
		{
			name: "description",
			content: "Find the best surf spots near you right now!",
		},
	];
}

export default function Home() {
	const navigate = useNavigate();
	const { toggleSpotFavorite, isSpotFavorited } = useFavorites();
	const [location, setLocation] = useState<{
		latitude: number;
		longitude: number;
	} | null>(null);
	const [loading, setLoading] = useState(false);
	const [spots, setSpots] = useState<any[]>([]);
	const [error, setError] = useState("");

	const getLocation = () => {
		setLoading(true);
		setError("");

		if (!navigator.geolocation) {
			setError("Geolocation is not supported by this browser");
			setLoading(false);
			return;
		}

		navigator.geolocation.getCurrentPosition(
			(position) => {
				const { latitude, longitude } = position.coords;
				setLocation({ latitude, longitude });
				findSurfSpots(latitude, longitude);
			},
			(error) => {
				setError(
					"Unable to get your location. Please enable location services."
				);
				setLoading(false);
			},
			{ enableHighAccuracy: true, timeout: 10000 }
		);
	};

	const findSurfSpots = async (latitude: number, longitude: number) => {
		try {
			// Try Netlify function first
			try {
				const response = await fetch(
					"/.netlify/functions/find-surf-spots",
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							latitude,
							longitude,
							maxDistance: 100,
						}), // 100km
					}
				);

				const data = await response.json();

				if (response.ok) {
					setSpots(data.spots);
					return;
				}
			} catch (networkError) {
				console.log("Netlify function not available, using local data");
			}

			// Fallback to local data processing with consistent mock data
			const mockSeed = latitude + longitude;
			const nearbySpots = surfSpotsData
				.map((spot, index) => {
					const spotSeed = mockSeed + index * 37;
					return createEnrichedSpot(spot, spotSeed, {
						latitude,
						longitude,
					});
				})
				.filter((spot) => spot.distance <= 100) // 100km
				.sort((a, b) => b.surfScore - a.surfScore) // Sort by score, not distance
				.slice(0, 10);

			setSpots(nearbySpots);
		} catch (err) {
			setError("Error finding surf spots. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-white">
			<div className="px-2 md:px-4 py-8">
				<div className="text-center mb-8">
					<h1 className="text-4xl font-bold text-black mb-2">
						Surf Finder
					</h1>
					<p className="text-lg text-gray-700">
						Find the best surf spots near you right now
					</p>
					<div className="mt-4 flex justify-center space-x-3">
						<a
							href="/spots"
							className="inline-block bg-black hover:bg-gray-800 text-white font-semibold py-2 px-4 border transition duration-200"
						>
							Browse All Spots
						</a>
						<a
							href="/favourites"
							className="inline-block bg-white hover:bg-gray-50 text-black font-semibold py-2 px-4 border border-black transition duration-200"
						>
							Favourites
						</a>
					</div>
				</div>

				<div className="max-w-none">
					{!location && (
						<div className="p-8 text-center">
							<div className="mb-6">
								<div className="w-20 h-20 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
									<svg
										className="w-10 h-10 text-white"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
										/>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
										/>
									</svg>
								</div>
								<h2 className="text-2xl font-semibold text-black mb-2">
									Ready to find epic surf?
								</h2>
								<p className="text-gray-600 mb-6">
									We'll find the best surf spots within 100km
									and check current conditions
								</p>
							</div>

							<button
								onClick={getLocation}
								disabled={loading}
								className="bg-black hover:bg-gray-800 text-white font-semibold py-3 px-8 transition duration-200 disabled:opacity-50"
							>
								{loading
									? "Getting Location..."
									: "Find Surf Spots Near Me"}
							</button>

							{error && (
								<div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
									{error}
								</div>
							)}
						</div>
					)}

					{location && (
						<div className="space-y-6">
							<div className="bg-white border border-gray-200 p-6">
								<div className="flex items-center justify-between mb-4">
									<h2 className="text-2xl font-semibold text-black">
										🌊 Top Surf Spots Near You
									</h2>
									<button
										onClick={() =>
											findSurfSpots(
												location.latitude,
												location.longitude
											)
										}
										disabled={loading}
										className="bg-black hover:bg-gray-800 text-white px-4 py-2 border transition duration-200 disabled:opacity-50"
									>
										{loading ? "Updating..." : "Refresh"}
									</button>
								</div>

								<p className="text-gray-600 mb-6">
									Location: {location.latitude.toFixed(4)},{" "}
									{location.longitude.toFixed(4)}
								</p>

								{loading && (
									<div className="text-center py-8">
										<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
										<p className="mt-2 text-gray-600">
											Checking surf conditions...
										</p>
									</div>
								)}

								{spots.length > 0 && (
									<div className="grid gap-4">
										{spots.map((spot, index) => (
											<div
												key={spot.name}
												className="border border-gray-300 p-6"
											>
												<div className="flex items-start justify-between mb-3">
													<div>
														<h3 className="text-xl font-semibold text-gray-800">
															#{index + 1}{" "}
															{spot.name}
														</h3>
														<p className="text-gray-600">
															{spot.region} •{" "}
															{spot.distance.toFixed(
																1
															)}
															km away •{" "}
															{spot.skillLevel}
														</p>
													</div>
													<div className="text-right">
														<div
															className={`text-2xl ${getScoreColor(spot.surfScore)}`}
														>
															{getScoreEmoji(
																spot.surfScore
															)}{" "}
															{spot.surfScore}/10
														</div>
													</div>
												</div>

												<div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4 text-sm">
													<div className="bg-white rounded-lg p-3">
														<div className="text-gray-500">
															Wave Height
														</div>
														<div className="font-semibold text-blue-600">
															{(
																(spot.waveHeight ||
																	0) * 3.28084
															).toFixed(1)}
															ft
														</div>
													</div>
													<div className="bg-white rounded-lg p-3">
														<div className="text-gray-500">
															Wind Speed
														</div>
														<div className="font-semibold text-green-600">
															{(
																(spot.windSpeed ||
																	0) *
																0.621371
															).toFixed(1)}{" "}
															mph
														</div>
													</div>
													<div className="bg-white rounded-lg p-3">
														<div className="text-gray-500">
															Period
														</div>
														<div className="font-semibold text-purple-600">
															{spot.conditions?.swellWavePeriod?.toFixed(
																1
															) ||
																spot.conditions?.wavePeriod?.toFixed(
																	1
																) ||
																"0"}
															s
														</div>
													</div>
													<div className="bg-white rounded-lg p-3">
														<div className="text-gray-500">
															Best Tide
														</div>
														<div className="font-semibold text-orange-600 capitalize">
															{spot.bestTide?.replace(
																"_",
																"-"
															) || "Any"}
														</div>
													</div>
													<div className="bg-white rounded-lg p-3">
														<div className="text-gray-500">
															Current Tide
														</div>
														<div className="font-semibold text-cyan-600">
															{spot.tideData ? (
																<>
																	{(
																		spot
																			.tideData
																			.currentLevel *
																		100
																	).toFixed(
																		0
																	)}
																	%
																	{spot
																		.tideData
																		.isRising
																		? " ↗️"
																		: " ↘️"}
																</>
															) : (
																"🔄 Mock"
															)}
														</div>
													</div>
												</div>

												<div className="space-y-4">
													{/* Best Time Display */}
													{spot.bestTime && (
														<div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200">
															<div className="flex items-center justify-between">
																<div>
																	<div className="text-sm font-semibold text-amber-800">
																		🏄‍♂️ Best
																		Time
																		Today
																	</div>
																	<div className="text-lg font-bold text-amber-700">
																		{
																			spot
																				.bestTime
																				.bestTime
																				.time
																		}{" "}
																		(
																		{
																			spot
																				.bestTime
																				.bestTime
																				.score
																		}
																		/10)
																	</div>
																	<div className="text-xs text-amber-600">
																		{spot.bestTime.bestTime.factors
																			.slice(
																				0,
																				2
																			)
																			.join(
																				", "
																			)}
																	</div>
																</div>
																<div className="text-2xl">
																	{spot
																		.bestTime
																		.bestTime
																		.score >=
																	8
																		? "🔥"
																		: spot
																					.bestTime
																					.bestTime
																					.score >=
																			  6.5
																			? "🌊"
																			: spot
																						.bestTime
																						.bestTime
																						.score >=
																				  5
																				? "👍"
																				: "⚠️"}
																</div>
															</div>
														</div>
													)}

													{/* Traffic Light Score Chart */}
													<TrafficLightChart
														height={60}
														variant="compact"
														className="border-0"
													/>

													{/* Professional Tide Chart */}
													<ProfessionalTideChart
														tideData={spot.tideData}
														showHours={24}
														height={180}
														className="border-0"
														latitude={spot.latitude}
														longitude={
															spot.longitude
														}
														variant="compact"
													/>

													{/* Professional Hourly Chart */}
													<ProfessionalHourlyChart
														data={spot.hourlyData}
														height={150}
														className="border-0"
														variant="compact"
													/>

													<p className="text-gray-700 bg-white rounded-lg p-3">
														<strong>
															Description:
														</strong>{" "}
														{spot.description}
													</p>

													{spot.bestConditions && (
														<p className="text-gray-700 bg-green-50 rounded-lg p-3">
															<strong>
																Optimal
																Conditions:
															</strong>{" "}
															{
																spot.bestConditions
															}
														</p>
													)}

													{spot.surfDescription && (
														<p className="text-gray-700 bg-blue-50 rounded-lg p-3">
															<strong>
																Current
																Assessment:
															</strong>{" "}
															{
																spot.surfDescription
															}
														</p>
													)}

													<div className="flex flex-wrap gap-2 text-sm">
														{spot.reliability && (
															<span className="bg-green-100 text-green-800 px-2 py-1 rounded">
																{
																	spot.reliability
																}
															</span>
														)}
														{spot.breakType && (
															<span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
																{spot.breakType}{" "}
																break
															</span>
														)}
														{spot.hazards && (
															<span className="bg-red-100 text-red-800 px-2 py-1 rounded">
																⚠️{" "}
																{spot.hazards}
															</span>
														)}
													</div>
												</div>

												<div className="mt-4 flex space-x-3">
													<button
														onClick={() =>
															toggleSpotFavorite({
																name: spot.name,
																latitude:
																	spot.latitude,
																longitude:
																	spot.longitude,
																region:
																	spot.region ||
																	"UK",
															})
														}
														className={`px-3 py-2 border text-xs transition duration-200 ${
															isSpotFavorited(
																spot.name
															)
																? "bg-black hover:bg-gray-800 text-white border-black"
																: "bg-white hover:bg-gray-50 text-black border-black"
														}`}
													>
														{isSpotFavorited(
															spot.name
														)
															? "★"
															: "☆"}
													</button>
													<button
														onClick={() =>
															window.open(
																`https://maps.google.com/maps?q=${spot.latitude},${spot.longitude}`,
																"_blank"
															)
														}
														className="bg-white hover:bg-gray-50 text-black px-4 py-2 border border-black transition duration-200"
													>
														Get Directions
													</button>
													<button
														onClick={() =>
															navigate(
																`/forecast/${spot.name.replace(/\s+/g, "-").toLowerCase()}?lat=${spot.latitude}&lng=${spot.longitude}`
															)
														}
														className="bg-black hover:bg-gray-800 text-white px-4 py-2 border transition duration-200"
													>
														5-Day Forecast
													</button>
												</div>
											</div>
										))}
									</div>
								)}

								{spots.length === 0 && !loading && location && (
									<div className="text-center py-8">
										<p className="text-gray-600">
											No surf spots found nearby. Try
											increasing the search distance.
										</p>
									</div>
								)}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
