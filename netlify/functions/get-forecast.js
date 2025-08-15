// Embed surf spots data directly to avoid file path issues in Netlify
const surfSpotsData = [
  {
    "name": "Fistral Beach",
    "latitude": 50.4161,
    "longitude": -5.0931,
    "skillLevel": "Intermediate",
    "reliability": "Very Consistent"
  },
  {
    "name": "Watergate Bay", 
    "latitude": 50.4425,
    "longitude": -5.0394,
    "skillLevel": "Beginner",
    "reliability": "Consistent"
  },
  {
    "name": "Polzeath",
    "latitude": 50.5689,
    "longitude": -4.9156,
    "skillLevel": "Beginner",
    "reliability": "Consistent"
  }
];

console.log('Netlify Function: get-forecast loaded');

function directionScore(actualDir, optimalRange) {
  if (!actualDir || !optimalRange) return 0.5;
  
  const [minOptimal, maxOptimal] = optimalRange;
  
  // Handle wraparound (e.g., 315-45 degrees)
  if (minOptimal > maxOptimal) {
    if (actualDir >= minOptimal || actualDir <= maxOptimal) {
      return 1.0;
    } else {
      const distToMin = Math.min(Math.abs(actualDir - minOptimal), 360 - Math.abs(actualDir - minOptimal));
      const distToMax = Math.min(Math.abs(actualDir - maxOptimal), 360 - Math.abs(actualDir - maxOptimal));
      const closestDist = Math.min(distToMin, distToMax);
      
      if (closestDist <= 15) return 0.9;
      if (closestDist <= 30) return 0.7;
      if (closestDist <= 45) return 0.5;
      if (closestDist <= 60) return 0.3;
      return 0.1;
    }
  } else {
    if (actualDir >= minOptimal && actualDir <= maxOptimal) {
      return 1.0;
    } else {
      const closestDist = Math.min(Math.abs(actualDir - minOptimal), Math.abs(actualDir - maxOptimal));
      
      if (closestDist <= 15) return 0.9;
      if (closestDist <= 30) return 0.7;
      if (closestDist <= 45) return 0.5;
      if (closestDist <= 60) return 0.3;
      return 0.1;
    }
  }
}

async function getTideData(latitude, longitude) {
  try {
    // Simple tide calculation for forecast (same as find-surf-spots.js)
    const currentTime = new Date();
    const lunarCycleMs = 12.42 * 60 * 60 * 1000; // ~12.42 hours between high tides
    const seedTime = Math.floor(currentTime.getTime() / lunarCycleMs);
    
    // Generate approximate tide times based on location and current time
    const tideHigh1 = new Date(seedTime * lunarCycleMs);
    const tideLow1 = new Date(tideHigh1.getTime() + (lunarCycleMs / 2));
    const tideHigh2 = new Date(tideHigh1.getTime() + lunarCycleMs);
    const tideLow2 = new Date(tideLow1.getTime() + lunarCycleMs);
    
    // Calculate current tide level (0-1, where 1 is high tide)
    const timeSinceHigh = (currentTime.getTime() - tideHigh1.getTime()) % lunarCycleMs;
    const tidePosition = Math.abs(Math.cos((timeSinceHigh / lunarCycleMs) * 2 * Math.PI));
    
    return {
      currentLevel: tidePosition,
      nextHigh: tideHigh2,
      nextLow: timeSinceHigh < lunarCycleMs/2 ? tideLow1 : tideLow2,
      isRising: Math.sin((timeSinceHigh / lunarCycleMs) * 2 * Math.PI) > 0
    };
  } catch (error) {
    console.error('Error calculating tide data:', error);
    return null;
  }
}

async function get5DayForecast(latitude, longitude) {
  try {
    // Marine weather data - 5 days
    const marineUrl = new URL('https://marine-api.open-meteo.com/v1/marine');
    marineUrl.searchParams.set('latitude', latitude);
    marineUrl.searchParams.set('longitude', longitude);
    marineUrl.searchParams.set('hourly', 'wave_height,swell_wave_height,wind_wave_height,wave_direction,swell_wave_direction,wave_period,swell_wave_period');
    marineUrl.searchParams.set('timezone', 'Europe/London');
    marineUrl.searchParams.set('forecast_days', '5');

    // Wind data - 5 days
    const windUrl = new URL('https://api.open-meteo.com/v1/forecast');
    windUrl.searchParams.set('latitude', latitude);
    windUrl.searchParams.set('longitude', longitude);
    windUrl.searchParams.set('hourly', 'wind_speed_10m,wind_direction_10m');
    windUrl.searchParams.set('timezone', 'Europe/London');
    windUrl.searchParams.set('forecast_days', '5');

    const [marineResponse, windResponse] = await Promise.all([
      fetch(marineUrl),
      fetch(windUrl)
    ]);

    const marineData = await marineResponse.json();
    const windData = await windResponse.json();

    return { marineData, windData };
  } catch (error) {
    console.error('Error fetching forecast:', error);
    return null;
  }
}

function calculateDaySurfScore(dayData, spot) {
  if (!dayData) return { score: 0, description: "No data available" };
  
  let score = 0;
  const factors = [];
  
  // Average the hourly data for the day
  const avgWaveHeight = dayData.waveHeight.reduce((a, b) => a + (b || 0), 0) / dayData.waveHeight.length;
  const avgSwellHeight = dayData.swellHeight.reduce((a, b) => a + (b || 0), 0) / dayData.swellHeight.length;
  const avgPeriod = dayData.period.reduce((a, b) => a + (b || 0), 0) / dayData.period.length;
  const avgWindSpeed = dayData.windSpeed.reduce((a, b) => a + (b || 0), 0) / dayData.windSpeed.length;
  
  const effectiveHeight = Math.max(avgWaveHeight, avgSwellHeight);
  
  // Wave height scoring (skill-level adjusted)
  const isBeginnerSpot = spot.skillLevel?.toLowerCase().includes('beginner');
  const isAdvancedSpot = spot.skillLevel?.toLowerCase().includes('advanced');
  
  let heightScore;
  if (isBeginnerSpot) {
    if (effectiveHeight >= 0.4 && effectiveHeight <= 1.5) {
      heightScore = 4;
      factors.push("Perfect beginner waves");
    } else if (effectiveHeight > 1.5 && effectiveHeight <= 2.0) {
      heightScore = 3;
      factors.push("Good size waves");
    } else if (effectiveHeight >= 0.2 && effectiveHeight < 0.4) {
      heightScore = 2;
      factors.push("Small but learnable");
    } else if (effectiveHeight > 2.0) {
      heightScore = 1;
      factors.push("Too big for beginners");
    } else {
      heightScore = 0;
      factors.push("Too small");
    }
  } else if (isAdvancedSpot) {
    if (effectiveHeight >= 1.5 && effectiveHeight <= 4.0) {
      heightScore = 4;
      factors.push("Excellent wave size");
    } else if (effectiveHeight > 4.0 && effectiveHeight <= 6.0) {
      heightScore = 3.5;
      factors.push("Big waves - advanced only");
    } else if (effectiveHeight >= 0.8 && effectiveHeight < 1.5) {
      heightScore = 3;
      factors.push("Decent size");
    } else if (effectiveHeight > 6.0) {
      heightScore = 2;
      factors.push("Very large - extreme conditions");
    } else {
      heightScore = 1;
      factors.push("Too small for this spot");
    }
  } else {
    if (effectiveHeight >= 0.6 && effectiveHeight <= 2.5) {
      heightScore = 4;
      factors.push("Great wave size");
    } else if (effectiveHeight > 2.5 && effectiveHeight <= 3.5) {
      heightScore = 3;
      factors.push("Good sized waves");
    } else if (effectiveHeight >= 0.3 && effectiveHeight < 0.6) {
      heightScore = 2;
      factors.push("Small but rideable");
    } else if (effectiveHeight > 3.5) {
      heightScore = 1.5;
      factors.push("Large waves");
    } else {
      heightScore = 0;
      factors.push("Too small");
    }
  }
  score += heightScore;
  
  // Period scoring
  let periodScore;
  if (avgPeriod >= 10 && avgPeriod <= 14) {
    periodScore = 2.5;
    factors.push("Premium groundswell");
  } else if (avgPeriod >= 8 && avgPeriod < 10) {
    periodScore = 2;
    factors.push("Good groundswell");
  } else if ((avgPeriod >= 6 && avgPeriod < 8) || (avgPeriod > 14 && avgPeriod <= 18)) {
    periodScore = 1.5;
    factors.push("Decent swell period");
  } else if (avgPeriod >= 4 && avgPeriod < 6) {
    periodScore = 0.8;
    factors.push("Short period windswell");
  } else if (avgPeriod > 0) {
    periodScore = 0.3;
    factors.push("Very short period");
  } else {
    periodScore = 0;
  }
  score += periodScore;
  
  // Swell direction (use most common direction)
  const swellDirs = dayData.swellDirection.filter(d => d !== null);
  if (swellDirs.length > 0 && spot.optimalSwellDir) {
    const avgSwellDir = swellDirs.reduce((a, b) => a + b, 0) / swellDirs.length;
    const swellScoreFactor = directionScore(avgSwellDir, spot.optimalSwellDir);
    score += 2.5 * swellScoreFactor;
    
    if (swellScoreFactor >= 0.9) {
      factors.push("Perfect swell angle!");
    } else if (swellScoreFactor >= 0.7) {
      factors.push("Good swell direction");
    } else if (swellScoreFactor >= 0.5) {
      factors.push("Acceptable swell angle");
    } else {
      factors.push("Poor swell direction");
    }
  } else {
    score += 1.2;
  }
  
  // Wind scoring
  if (avgWindSpeed <= 8) {
    score += 2;
    factors.push("Light winds");
  } else if (avgWindSpeed <= 15) {
    score += 1.5;
    factors.push("Moderate winds");
  } else if (avgWindSpeed <= 25) {
    score += 0.8;
    factors.push("Strong winds");
  } else {
    score += 0.2;
    factors.push("Very strong winds");
  }
  
  // Tide scoring (simplified for daily average) - 0-2 points
  let tideScore = 1.5; // Default neutral score
  if (dayData.tideData && spot.bestTide) {
    const bestTide = spot.bestTide.toLowerCase();
    if (bestTide === 'all' || bestTide === 'any') {
      tideScore = 2;
      factors.push("Works all tides");
    } else {
      // For daily forecast, give a general tide bonus
      tideScore = 1.7;
      factors.push("Tide favorable");
    }
  }
  score += tideScore;
  
  // Reliability bonus
  let reliabilityBonus = 0;
  if (spot.reliability) {
    const reliability = spot.reliability.toLowerCase();
    if (reliability.includes('very consistent')) {
      reliabilityBonus = 1;
    } else if (reliability.includes('consistent')) {
      reliabilityBonus = 0.7;
    } else if (reliability.includes('seasonal')) {
      reliabilityBonus = 0.3;
    }
  }
  score += reliabilityBonus;
  
  return { 
    score: Math.round(score * 10) / 10, 
    waveHeight: effectiveHeight,
    period: avgPeriod,
    windSpeed: avgWindSpeed,
    factors: factors.slice(0, 3), // Top 3 factors
    tideData: dayData.tideData
  };
}

function processHourlyToDaily(marineData, windData, tideData) {
  const times = marineData.hourly?.time || [];
  const dailyData = [];
  
  // Group by day
  const days = {};
  times.forEach((time, index) => {
    const date = time.split('T')[0];
    if (!days[date]) {
      days[date] = {
        date,
        waveHeight: [],
        swellHeight: [],
        period: [],
        swellDirection: [],
        windSpeed: [],
        windDirection: [],
        tideData: tideData // Add tide data to each day
      };
    }
    
    days[date].waveHeight.push(marineData.hourly.wave_height[index]);
    days[date].swellHeight.push(marineData.hourly.swell_wave_height[index]);
    days[date].period.push(marineData.hourly.swell_wave_period[index] || marineData.hourly.wave_period[index]);
    days[date].swellDirection.push(marineData.hourly.swell_wave_direction[index] || marineData.hourly.wave_direction[index]);
    days[date].windSpeed.push(windData.hourly.wind_speed_10m[index]);
    days[date].windDirection.push(windData.hourly.wind_direction_10m[index]);
  });
  
  return Object.values(days);
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    const { lat, lng, spotName } = event.queryStringParameters || {};
    
    if (!lat || !lng) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Latitude and longitude are required' })
      };
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    
    // Find the spot data
    const spot = surfSpotsData.find(s => 
      s.name.toLowerCase().replace(/\s+/g, '-') === spotName?.toLowerCase() ||
      Math.abs(s.latitude - latitude) < 0.01 && Math.abs(s.longitude - longitude) < 0.01
    );

    // Get 5-day forecast and tide data
    const [forecastData, tideData] = await Promise.all([
      get5DayForecast(latitude, longitude),
      getTideData(latitude, longitude)
    ]);
    
    if (!forecastData) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch forecast data' })
      };
    }

    // Process hourly to daily
    const dailyData = processHourlyToDaily(forecastData.marineData, forecastData.windData, tideData);
    
    // Calculate scores for each day
    const forecast = dailyData.map(dayData => {
      const dayScore = calculateDaySurfScore(dayData, spot || {});
      
      // Format date
      const date = new Date(dayData.date);
      const dayName = date.toLocaleDateString('en-GB', { weekday: 'long' });
      const dateStr = date.toLocaleDateString('en-GB', { 
        month: 'short', 
        day: 'numeric' 
      });
      
      return {
        date: dayData.date,
        dayName,
        dateStr,
        score: dayScore.score,
        waveHeight: dayScore.waveHeight,
        period: dayScore.period,
        windSpeed: dayScore.windSpeed,
        factors: dayScore.factors,
        tideData: dayScore.tideData,
        rating: dayScore.score >= 7 ? 'Excellent' : 
                dayScore.score >= 5.5 ? 'Good' : 
                dayScore.score >= 4 ? 'Average' : 
                dayScore.score >= 2 ? 'Poor' : 'Very Poor'
      };
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        spot: spot || { name: spotName || 'Unknown Spot', latitude, longitude },
        forecast,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};