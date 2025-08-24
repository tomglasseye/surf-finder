import { useState, useEffect, useMemo } from "react";
import type { ReactElement } from "react";
import {
	ResponsiveContainer,
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ReferenceArea,
	ReferenceLine,
} from "recharts";
import { getAdmiraltyTideData, getSunriseSunsetData } from "../utils/admiraltyApi";
import DataOverlay from "./DataOverlay";

interface TideEvent {
	time: string;
	type: "high" | "low";
	height: number;
}

interface TideChartProps {
	latitude: number;
	longitude: number;
	spotName: string;
	showDays?: number; // 1 for today only, 5 for forecast
	height?: number;
	className?: string;
	targetDate?: Date; // The specific date to show
}

interface ChartDataPoint {
	hour: number;
	time: string;
	level: number;
	percentage: number;
	heightMeters: number;
	isHighTide: boolean;
	isLowTide: boolean;
	isNow: boolean;
	isDaylight: boolean;
	isSunrise: boolean;
	isSunset: boolean;
	date: string;
}

export default function TideChart({
	latitude,
	longitude,
	spotName,
	showDays = 1,
	height = 300,
	className = "",
	targetDate,
}: TideChartProps) {
	const [tideData, setTideData] = useState<TideEvent[]>([]);
	const [sunData, setSunData] = useState<{[date: string]: {sunrise: Date; sunset: Date}}>({});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [dataSource, setDataSource] = useState<string>("");

	useEffect(() => {
		loadTideData();
	}, [latitude, longitude, showDays, targetDate]);

	const loadTideData = async () => {
		try {
			setLoading(true);
			setError("");

			const startDate = targetDate ? new Date(targetDate) : new Date();
			startDate.setHours(0, 0, 0, 0);
			
			const endDate = new Date(startDate);
			endDate.setDate(startDate.getDate() + showDays);

			console.log(`🌊 Loading tide data for ${spotName} (${latitude}, ${longitude}) - ${showDays} days from ${startDate.toISOString()}`);

			// Load tide data
			const tideResponse = await getAdmiraltyTideData(
				latitude,
				longitude,
				startDate,
				endDate
			);

			setTideData(tideResponse.tideEvents);
			setDataSource(tideResponse.source || 'unknown');
			console.log(`🌊 Loaded ${tideResponse.tideEvents.length} tide events from ${tideResponse.source}`);

			// Load sunrise/sunset data for each day
			const sunDataMap: {[date: string]: {sunrise: Date; sunset: Date}} = {};
			for (let i = 0; i < showDays; i++) {
				const date = new Date(startDate);
				date.setDate(startDate.getDate() + i);
				date.setHours(12, 0, 0, 0); // Use noon to avoid timezone issues
				const dateStr = date.toISOString().split('T')[0];
				
				console.log(`🌅 Loading sun data for ${dateStr} (day ${i})`);
				
				try {
					const sunTimes = await getSunriseSunsetData(latitude, longitude, date);
					sunDataMap[dateStr] = sunTimes;
					console.log(`✅ Loaded sun data for ${dateStr}:`, sunTimes);
				} catch (e) {
					console.warn(`Failed to load sun data for ${dateStr}:`, e);
				}
			}
			setSunData(sunDataMap);
			console.log(`🌅 Loaded sun data for ${Object.keys(sunDataMap).length} days`);

		} catch (err) {
			console.error("Failed to load tide data:", err);
			setError("Failed to load tide data");
			setDataSource("error");
		} finally {
			setLoading(false);
		}
	};

	const now = targetDate ? new Date(targetDate) : new Date();
	
	const startDate = useMemo(() => {
		const start = targetDate ? new Date(targetDate) : new Date();
		start.setHours(0, 0, 0, 0);
		return start;
	}, [targetDate]);

	const chartData = useMemo(() => {
		console.log(`📊 Generating chart data: ${tideData.length} tide events, ${Object.keys(sunData).length} sun days, target date: ${startDate.toISOString()}`);
		
		if (tideData.length === 0) {
			console.log("❌ No tide data available for chart generation");
			return [];
		}
		const data: ChartDataPoint[] = [];
		
		const totalMinutes = showDays * 24 * 60;
		const minuteInterval = 15;

		// Calculate height range for normalization
		const heights = tideData.map(event => event.height);
		const minHeight = Math.min(...heights);
		const maxHeight = Math.max(...heights);
		const heightRange = maxHeight - minHeight;

		for (let minute = 0; minute < totalMinutes; minute += minuteInterval) {
			const currentTime = new Date(startDate.getTime() + minute * 60000);
			const currentTimeMs = currentTime.getTime();
			const dateStr = currentTime.toISOString().split('T')[0];
			
			// Find surrounding tide events
			let beforeEvent = null;
			let afterEvent = null;

			for (let i = 0; i < tideData.length; i++) {
				const eventTime = new Date(tideData[i].time).getTime();
				
				if (eventTime <= currentTimeMs) {
					beforeEvent = tideData[i];
				} else if (eventTime > currentTimeMs && !afterEvent) {
					afterEvent = tideData[i];
					break;
				}
			}

			// Interpolate tide level using smooth cosine curve
			let tideLevel = 0.5;
			let heightMeters = (minHeight + maxHeight) / 2;
			let isHighTide = false;
			let isLowTide = false;

			if (beforeEvent && afterEvent) {
				const beforeTime = new Date(beforeEvent.time).getTime();
				const afterTime = new Date(afterEvent.time).getTime();
				const progress = (currentTimeMs - beforeTime) / (afterTime - beforeTime);

				let smoothProgress;
				if (beforeEvent.type === "high" && afterEvent.type === "low") {
					// Falling tide: smooth curve from high to low
					smoothProgress = (1 - Math.cos(progress * Math.PI)) / 2;
				} else if (beforeEvent.type === "low" && afterEvent.type === "high") {
					// Rising tide: smooth curve from low to high
					smoothProgress = (1 + Math.cos((1 - progress) * Math.PI)) / 2;
				} else {
					// Same type - linear
					smoothProgress = progress;
				}

				const interpolatedHeight = beforeEvent.height + 
					(afterEvent.height - beforeEvent.height) * smoothProgress;
				
				tideLevel = heightRange > 0 ? (interpolatedHeight - minHeight) / heightRange : 0.5;
				heightMeters = interpolatedHeight;

				// Mark exact tide events (within 15 minutes for precision)
				for (const event of tideData) {
					const eventTime = new Date(event.time);
					if (Math.abs(eventTime.getTime() - currentTimeMs) <= 15 * 60 * 1000) {
						isHighTide = event.type === "high";
						isLowTide = event.type === "low";
						break;
					}
				}
			} else if (beforeEvent) {
				// Extrapolate curve from before event (end of chart scenario)
				const nearestAfterEvent = tideData.find(event => 
					new Date(event.time).getTime() > new Date(beforeEvent.time).getTime()
				);
				
				if (nearestAfterEvent) {
					// Calculate the trend direction and continue the curve
					const beforeTime = new Date(beforeEvent.time).getTime();
					const afterTime = new Date(nearestAfterEvent.time).getTime();
					const timeExtension = Math.min((currentTimeMs - beforeTime) / (afterTime - beforeTime), 1.0);
					
					// Use smooth cosine extrapolation for natural tidal curves
					let smoothExtension;
					if (beforeEvent.type === "high" && nearestAfterEvent.type === "low") {
						// Falling tide: continue smooth fall
						smoothExtension = (1 - Math.cos(timeExtension * Math.PI)) / 2;
					} else if (beforeEvent.type === "low" && nearestAfterEvent.type === "high") {
						// Rising tide: continue smooth rise
						smoothExtension = (1 + Math.cos((1 - timeExtension) * Math.PI)) / 2;
					} else {
						// Linear for same type
						smoothExtension = timeExtension;
					}
					
					const heightDifference = nearestAfterEvent.height - beforeEvent.height;
					const extrapolatedHeight = beforeEvent.height + (heightDifference * smoothExtension);
					
					tideLevel = heightRange > 0 ? (extrapolatedHeight - minHeight) / heightRange : 0.5;
					heightMeters = extrapolatedHeight;
				} else {
					// Fallback to static level
					tideLevel = heightRange > 0 ? (beforeEvent.height - minHeight) / heightRange : 0.5;
					heightMeters = beforeEvent.height;
				}
			} else if (afterEvent) {
				// Extrapolate curve from after event (start of chart scenario)
				const nearestBeforeEvent = [...tideData].reverse().find(event => 
					new Date(event.time).getTime() < new Date(afterEvent.time).getTime()
				);
				
				if (nearestBeforeEvent) {
					// Calculate the trend direction and continue the curve backwards
					const beforeTime = new Date(nearestBeforeEvent.time).getTime();
					const afterTime = new Date(afterEvent.time).getTime();
					const timeExtension = Math.min((afterTime - currentTimeMs) / (afterTime - beforeTime), 1.0);
					const progress = 1 - timeExtension; // How far we've progressed from before to after
					
					// Use smooth cosine extrapolation for natural tidal curves
					let smoothProgress;
					if (nearestBeforeEvent.type === "high" && afterEvent.type === "low") {
						// Falling tide: continue smooth fall backwards
						smoothProgress = (1 - Math.cos(progress * Math.PI)) / 2;
					} else if (nearestBeforeEvent.type === "low" && afterEvent.type === "high") {
						// Rising tide: continue smooth rise backwards
						smoothProgress = (1 + Math.cos((1 - progress) * Math.PI)) / 2;
					} else {
						// Linear for same type
						smoothProgress = progress;
					}
					
					const heightDifference = afterEvent.height - nearestBeforeEvent.height;
					const extrapolatedHeight = nearestBeforeEvent.height + (heightDifference * smoothProgress);
					
					tideLevel = heightRange > 0 ? (extrapolatedHeight - minHeight) / heightRange : 0.5;
					heightMeters = extrapolatedHeight;
				} else {
					// Fallback to static level
					tideLevel = heightRange > 0 ? (afterEvent.height - minHeight) / heightRange : 0.5;
					heightMeters = afterEvent.height;
				}
			}

			// Ensure bounds
			tideLevel = Math.max(0.05, Math.min(0.95, tideLevel));

			// Check if current time (accurate to minutes) - only show for today
			const actualNow = new Date();
			const isToday = !targetDate || 
				(targetDate.toDateString() === actualNow.toDateString());
			const isNow = isToday && Math.abs(currentTimeMs - actualNow.getTime()) < minuteInterval * 60 * 1000;

			// Check daylight status
			const sunTimes = sunData[dateStr];
			let isDaylight = true;
			let isSunrise = false;
			let isSunset = false;

			if (sunTimes) {
				const sunriseTime = sunTimes.sunrise.getTime();
				const sunsetTime = sunTimes.sunset.getTime();
				
				isDaylight = currentTimeMs >= sunriseTime && currentTimeMs <= sunsetTime;
				isSunrise = Math.abs(currentTimeMs - sunriseTime) < 30 * 60 * 1000; // Within 30 minutes
				isSunset = Math.abs(currentTimeMs - sunsetTime) < 30 * 60 * 1000; // Within 30 minutes
			}

			const hour = currentTime.getHours() + currentTime.getMinutes() / 60;
			const dayOffset = Math.floor(minute / (24 * 60));

			data.push({
				hour: hour + (dayOffset * 24),
				time: currentTime.toLocaleTimeString("en-GB", { 
					hour: "2-digit", 
					minute: "2-digit" 
				}),
				level: tideLevel,
				percentage: Math.round(tideLevel * 100),
				heightMeters: Number(heightMeters.toFixed(1)),
				isHighTide,
				isLowTide,
				isNow,
				isDaylight,
				isSunrise,
				isSunset,
				date: dateStr,
			});
		}

		return data;
	}, [tideData, sunData, showDays, startDate]);

	const generateMarkers = () => {
		const markers = [];
		console.log(`🔍 Generating markers with chartData length: ${chartData.length}`);
		
		// Current time marker (most accurate) - only show for today
		const actualNow = new Date();
		const isToday = !targetDate || 
			(targetDate.toDateString() === actualNow.toDateString());
		
		if (isToday) {
			const currentPoints = chartData.filter(p => p.isNow);
			console.log(`🕐 Found ${currentPoints.length} current time points`);
			if (currentPoints.length > 0) {
				const currentPoint = currentPoints[0];
				console.log(`🕐 Adding current time marker at: ${currentPoint.time}`);
				markers.push(
					<ReferenceLine
						key="current-time"
						x={currentPoint.time}
						stroke="#f59e0b"
						strokeWidth={3}
						label={{
							value: "Now",
							position: "top",
							fontSize: 12,
							fill: "#f59e0b",
							fontWeight: "bold",
						}}
					/>
				);
			}
		}

		// High/Low tide markers - show for the target date
		const uniqueTideEvents = new Map();
		
		console.log(`🔍 Available tide data:`, tideData.map(e => ({ time: e.time, type: e.type, height: e.height })));
		
		// Filter tide events for the target date (not just today)
		const targetDateStart = new Date(startDate);
		targetDateStart.setHours(0, 0, 0, 0);
		const targetDateEnd = new Date(targetDateStart);
		targetDateEnd.setDate(targetDateStart.getDate() + showDays);
		
		console.log(`🗓️ Looking for events between ${targetDateStart.toISOString()} and ${targetDateEnd.toISOString()}`);
		
		// Filter tide events to only show events for the specific target date
		const targetDateEvents = tideData.filter(event => {
			const eventTime = new Date(event.time);
			const eventDate = new Date(eventTime);
			eventDate.setHours(0, 0, 0, 0);
			
			// Check if this event is on the target date
			const isOnTargetDate = eventDate.getTime() === targetDateStart.getTime();
			
			console.log(`🔍 Checking event at ${event.time} (${eventTime.toISOString()}) - event date: ${eventDate.toISOString()}, target date: ${targetDateStart.toISOString()}, isOnTargetDate: ${isOnTargetDate}`);
			
			return isOnTargetDate;
		});
		
		console.log(`📅 Found ${targetDateEvents.length} events for target date:`, targetDateEvents);
		
		// Add all high and low tides from the target date's events
		targetDateEvents.forEach((event, index) => {
			if (event.type === "high" || event.type === "low") {
				uniqueTideEvents.set(`${event.type}-${event.time}-${index}`, event);
			}
		});
		
		console.log(`🏔️ All tide events for target date:`, Array.from(uniqueTideEvents.values()));

		console.log(`🌊 Found ${uniqueTideEvents.size} unique tide events:`, Array.from(uniqueTideEvents.keys()));
		
		uniqueTideEvents.forEach((event, key) => {
			const eventTime = new Date(event.time);
			const timeString = eventTime.toLocaleTimeString("en-GB", { 
				hour: "2-digit", 
				minute: "2-digit" 
			});
			console.log(`🌊 Adding tide marker for ${event.type} at ${timeString}`);
			
			// Find closest data point in chartData for X coordinate
			const eventHours = eventTime.getHours();
			const eventMinutes = eventTime.getMinutes();
			const eventTotalMinutes = eventHours * 60 + eventMinutes;
			
			let closestPoint = chartData[0];
			let smallestDiff = Infinity;
			
			chartData.forEach(point => {
				const [pointHours, pointMinutes] = point.time.split(':').map(Number);
				const pointTotalMinutes = pointHours * 60 + pointMinutes;
				const diff = Math.abs(pointTotalMinutes - eventTotalMinutes);
				
				if (diff < smallestDiff) {
					smallestDiff = diff;
					closestPoint = point;
				}
			});
			
			console.log(`🎯 Found closest point for ${timeString}: ${closestPoint.time} (diff: ${smallestDiff} minutes)`);

			if (event.type === "high") {
				markers.push(
					<ReferenceLine
						key={`high-${key}`}
						x={closestPoint.time}
						stroke="#10b981"
						strokeWidth={2}
						strokeDasharray="4 4"
						label={{
							value: `High ${event.height.toFixed(1)}m`,
							position: "top",
							fontSize: 11,
							fill: "#10b981",
						}}
					/>
				);
			} else if (event.type === "low") {
				markers.push(
					<ReferenceLine
						key={`low-${key}`}
						x={closestPoint.time}
						stroke="#ef4444"
						strokeWidth={2}
						strokeDasharray="4 4"
						label={{
							value: `Low ${event.height.toFixed(1)}m`,
							position: "top",
							fontSize: 11,
							fill: "#ef4444",
						}}
					/>
				);
			}
		});

		// Sunrise/Sunset markers - for the target date
		const uniqueSunEvents = new Map();
		const targetDateStr = startDate.toISOString().split('T')[0];
		
		console.log(`🌅 Looking for sun data for ${targetDateStr}, available dates:`, Object.keys(sunData));
		console.log(`🌅 Target date:`, startDate);
		console.log(`🌅 Available sunData keys:`, Object.keys(sunData));
		
		if (sunData[targetDateStr]) {
			const sunTimes = sunData[targetDateStr];
			console.log(`🌅 Found sun times for target date:`, sunTimes);
			
			const sunriseTime = sunTimes.sunrise.toLocaleTimeString("en-GB", { 
				hour: "2-digit", 
				minute: "2-digit" 
			});
			const sunsetTime = sunTimes.sunset.toLocaleTimeString("en-GB", { 
				hour: "2-digit", 
				minute: "2-digit" 
			});
			
			uniqueSunEvents.set(`sunrise-${targetDateStr}`, {
				time: sunriseTime,
				type: 'sunrise',
				emoji: '🌅'
			});
			
			uniqueSunEvents.set(`sunset-${targetDateStr}`, {
				time: sunsetTime,
				type: 'sunset', 
				emoji: '🌇'
			});
		} else {
			console.log(`❌ No sun data found for ${targetDateStr}`);
		}

		console.log(`🌊 Generated ${uniqueTideEvents.size} tide markers and ${uniqueSunEvents.size} sun markers`);

		uniqueSunEvents.forEach((sunEvent, key) => {
			// Find closest data point in chartData for X coordinate
			const [sunHours, sunMinutes] = sunEvent.time.split(':').map(Number);
			const sunTotalMinutes = sunHours * 60 + sunMinutes;
			
			let closestPoint = chartData[0];
			let smallestDiff = Infinity;
			
			chartData.forEach(point => {
				const [pointHours, pointMinutes] = point.time.split(':').map(Number);
				const pointTotalMinutes = pointHours * 60 + pointMinutes;
				const diff = Math.abs(pointTotalMinutes - sunTotalMinutes);
				
				if (diff < smallestDiff) {
					smallestDiff = diff;
					closestPoint = point;
				}
			});
			
			console.log(`🌅 Found closest point for ${sunEvent.type} at ${sunEvent.time}: ${closestPoint.time} (diff: ${smallestDiff} minutes)`);
			
			markers.push(
				<ReferenceLine
					key={key}
					x={closestPoint.time}
					stroke="#f97316"
					strokeWidth={1}
					strokeDasharray="2 2"
					label={{
						value: sunEvent.emoji,
						position: "top",
						fontSize: 14,
					}}
				/>
			);
		});

		console.log(`🎯 Total markers generated: ${markers.length}`);
		return markers;
	};

	const generateNightAreas = () => {
		const areas: ReactElement[] = [];
		const targetDateStr = startDate.toISOString().split('T')[0];
		
		console.log(`🌙 Looking for night areas for ${targetDateStr}`);
		
		const sunTimes = sunData[targetDateStr];
		if (sunTimes) {
			console.log(`🌙 Found sun times for night areas:`, sunTimes);
			
			const sunriseTime = sunTimes.sunrise;
			const sunsetTime = sunTimes.sunset;
			
			// Check if sunrise and sunset are on the target date
			if (sunriseTime.toDateString() === startDate.toDateString()) {
				const startTime = "00:00";
				
				// Find closest point for sunrise
				const sunriseHours = sunriseTime.getHours();
				const sunriseMinutes = sunriseTime.getMinutes();
				const sunriseTotalMinutes = sunriseHours * 60 + sunriseMinutes;
				
				let closestSunrisePoint = chartData[0];
				let smallestSunriseDiff = Infinity;
				
				chartData.forEach(point => {
					const [pointHours, pointMinutes] = point.time.split(':').map(Number);
					const pointTotalMinutes = pointHours * 60 + pointMinutes;
					const diff = Math.abs(pointTotalMinutes - sunriseTotalMinutes);
					
					if (diff < smallestSunriseDiff) {
						smallestSunriseDiff = diff;
						closestSunrisePoint = point;
					}
				});
				
				// Night area from midnight to sunrise
				areas.push(
					<ReferenceArea
						key="night-start"
						x1={startTime}
						x2={closestSunrisePoint.time}
						fill="#1f2937"
						fillOpacity={0.15}
						stroke="none"
					/>
				);
				console.log(`🌙 Added morning night area: ${startTime} to ${closestSunrisePoint.time} (sunrise closest match)`);
			}
			
			if (sunsetTime.toDateString() === startDate.toDateString()) {
				// Find closest point for sunset
				const sunsetHours = sunsetTime.getHours();
				const sunsetMinutes = sunsetTime.getMinutes();
				const sunsetTotalMinutes = sunsetHours * 60 + sunsetMinutes;
				
				let closestSunsetPoint = chartData[chartData.length - 1];
				let smallestSunsetDiff = Infinity;
				
				chartData.forEach(point => {
					const [pointHours, pointMinutes] = point.time.split(':').map(Number);
					const pointTotalMinutes = pointHours * 60 + pointMinutes;
					const diff = Math.abs(pointTotalMinutes - sunsetTotalMinutes);
					
					if (diff < smallestSunsetDiff) {
						smallestSunsetDiff = diff;
						closestSunsetPoint = point;
					}
				});
				
				// Use the last data point in the chart as the end time
				const lastDataPoint = chartData[chartData.length - 1];
				const endTime = lastDataPoint.time;
				
				// Night area from sunset to end of day
				areas.push(
					<ReferenceArea
						key="night-end"
						x1={closestSunsetPoint.time}
						x2={endTime}
						fill="#1f2937"
						fillOpacity={0.15}
						stroke="none"
					/>
				);
				console.log(`🌙 Added evening night area: ${closestSunsetPoint.time} (sunset closest match) to ${endTime} (last data point)`);
			}
		} else {
			console.log(`❌ No sun times found for night areas on ${targetDateStr}`);
		}

		console.log(`🌙 Generated ${areas.length} night areas for target date`);
		return areas;
	};

	const CustomTooltip = ({ active, payload, label }: any) => {
		if (active && payload?.[0]) {
			const data = payload[0].payload;
			return (
				<div className="bg-white p-3 rounded-lg shadow-lg border">
					<p className="font-semibold">{label}</p>
					<p className="text-blue-600">Tide: {data.percentage}%</p>
					<p className="text-gray-600">Height: {data.heightMeters}m</p>
					{data.isHighTide && <p className="text-green-600">🌊 High Tide</p>}
					{data.isLowTide && <p className="text-red-600">🏖️ Low Tide</p>}
					{data.isNow && <p className="text-amber-600">📍 Current Time</p>}
					{data.isSunrise && <p className="text-orange-500">🌅 Sunrise</p>}
					{data.isSunset && <p className="text-orange-600">🌇 Sunset</p>}
					{!data.isDaylight && <p className="text-gray-400">🌙 Night</p>}
					<p className="text-xs text-gray-500">{data.date}</p>
				</div>
			);
		}
		return null;
	};

	if (loading) {
		return (
			<div className={`bg-white rounded-lg p-4 ${className}`}>
				<div className="flex items-center justify-center h-64">
					<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					<span className="ml-3 text-gray-600">Loading tide data...</span>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className={`bg-white rounded-lg p-4 ${className}`}>
				<div className="text-center text-red-600">
					<p>Error loading tide data: {error}</p>
					<button
						onClick={loadTideData}
						className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
					>
						Retry
					</button>
				</div>
			</div>
		);
	}

	if (!tideData || tideData.length === 0) {
		return (
			<div className={`bg-white rounded-lg p-4 ${className}`}>
				<div className="text-center text-gray-600">
					<p>No tide data available</p>
					<p className="text-sm">Tide events: {tideData?.length || 0}</p>
					<p className="text-sm">Sun data days: {Object.keys(sunData).length}</p>
				</div>
			</div>
		);
	}

	console.log(`📊 Rendering TideChart for ${spotName}: ${tideData.length} tide events, ${Object.keys(sunData).length} sun days`);

	// Determine if this is live data
	const isLiveData = dataSource === 'admiralty_uk';

	return (
		<DataOverlay 
			isLiveData={isLiveData}
			dataSource={dataSource}
			className={`bg-white rounded-lg p-4 ${className}`}
		>
			<div className="flex justify-between items-center mb-4">
				<h3 className="text-lg font-semibold text-gray-800">
					🌊 Tide Chart - {spotName}
				</h3>
				<div className="text-sm text-gray-600">
					{showDays === 1 ? "Today" : `${showDays} Days`} • {isLiveData ? 'UK Admiralty' : 'Demo Data'}
				</div>
			</div>

			<ResponsiveContainer width="100%" height={height}>
				<LineChart
					data={chartData}
					margin={{ top: 30, right: 30, left: 20, bottom: 20 }}
				>
					<CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

					{/* Night time shading */}
					{generateNightAreas()}

					{/* All markers */}
					{generateMarkers()}

					<XAxis
						dataKey="time"
						tick={{ fontSize: 12 }}
						interval={Math.floor(chartData.length / 12)} // Show ~12 labels
					/>
					<YAxis
						domain={[0, 1]}
						tick={{ fontSize: 12 }}
						tickFormatter={(value) => `${Math.round(value * 100)}%`}
					/>
					<Tooltip content={<CustomTooltip />} />
					<Line
						type="monotone"
						dataKey="level"
						stroke="#3b82f6"
						strokeWidth={3}
						dot={false}
						activeDot={{ r: 6, fill: "#1d4ed8" }}
					/>
				</LineChart>
			</ResponsiveContainer>

			{/* Tide events summary */}
			{tideData.length > 0 && (
				<div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
					{tideData.slice(0, 8).map((event, index) => {
						const eventTime = new Date(event.time);
						return (
							<div
								key={index}
								className={`flex flex-col p-2 rounded ${
									event.type === "high"
										? "bg-green-50 text-green-800"
										: "bg-red-50 text-red-800"
								}`}
							>
								<span className="font-medium">
									{event.type === "high" ? "⬆️ High" : "⬇️ Low"}
								</span>
								<span className="text-xs">
									{eventTime.toLocaleDateString("en-GB", { 
										month: "short", 
										day: "numeric" 
									})}
								</span>
								<span>
									{eventTime.toLocaleTimeString("en-GB", {
										hour: "2-digit",
										minute: "2-digit",
									})}
								</span>
								<span className="font-bold">
									{event.height.toFixed(1)}m
								</span>
							</div>
						);
					})}
				</div>
			)}
		</DataOverlay>
	);
}