// Embed surf spots data directly to avoid file path issues in Netlify
const surfSpotsData = [
  {
    "name": "Fistral Beach",
    "latitude": 50.4161,
    "longitude": -5.0931,
    "region": "Cornwall",
    "skillLevel": "Intermediate",
    "optimalSwellDir": [270, 315],
    "optimalWindDir": [45, 135],
    "faces": "N",
    "bestTide": "mid",
    "breakType": "beach",
    "reliability": "Very Consistent",
    "hazards": "crowded, rips",
    "bestConditions": "Best conditions occur when west-southwest swell combines with offshore wind from southeast",
    "description": "Fistral Beach is Cornwall's most famous surf spot. This fairly exposed beach break has consistent surf and is rarely flat."
  },
  {
    "name": "Watergate Bay",
    "latitude": 50.4425,
    "longitude": -5.0394,
    "region": "Cornwall",
    "skillLevel": "Beginner",
    "optimalSwellDir": [270, 315],
    "optimalWindDir": [90, 180],
    "faces": "NW",
    "bestTide": "low_to_mid", 
    "breakType": "beach",
    "reliability": "Consistent",
    "hazards": "rips",
    "bestConditions": "Best conditions occur when northwest swell combines with offshore wind from southeast",
    "description": "Two mile long sandy beach offering excellent surf for all levels."
  },
  {
    "name": "Polzeath",
    "latitude": 50.5689,
    "longitude": -4.9156,
    "region": "Cornwall",
    "skillLevel": "Beginner",
    "optimalSwellDir": [270, 330],
    "optimalWindDir": [135, 225],
    "faces": "NW",
    "bestTide": "mid_to_high",
    "breakType": "beach", 
    "reliability": "Consistent",
    "hazards": "crowded",
    "bestConditions": "Best conditions occur when northwest swell combines with offshore wind from southeast to south",
    "description": "Protected sandy bay that's popular with families and surf schools."
  },
  {
    "name": "Croyde Bay",
    "latitude": 51.1261,
    "longitude": -4.2394,
    "region": "Devon",
    "skillLevel": "Beginner",
    "optimalSwellDir": [270, 330],
    "optimalWindDir": [90, 180],
    "faces": "NW",
    "bestTide": "mid",
    "breakType": "beach",
    "reliability": "Very Consistent",
    "hazards": "crowded, rips",
    "bestConditions": "Best conditions occur when west-northwest swell combines with offshore wind from southeast",
    "description": "Picturesque bay with consistent surf year-round."
  },
  {
    "name": "Woolacombe",
    "latitude": 51.1833,
    "longitude": -4.2167,
    "region": "Devon",
    "skillLevel": "Beginner",
    "optimalSwellDir": [270, 330],
    "optimalWindDir": [90, 180],
    "faces": "NW",
    "bestTide": "all",
    "breakType": "beach",
    "reliability": "Very Consistent",
    "hazards": "rips",
    "bestConditions": "Best conditions occur when west-northwest swell combines with offshore wind from southeast",
    "description": "Three mile stretch of golden sand that works on all tides."
  }
];

console.log('Netlify Function: find-surf-spots loaded with', surfSpotsData.length, 'spots');

// Helper functions
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  const deltaLat = (lat2 - lat1) * Math.PI / 180;
  const deltaLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) *
            Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

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

async function getSurfConditions(latitude, longitude) {
  try {
    // Marine weather data
    const marineUrl = new URL('https://marine-api.open-meteo.com/v1/marine');
    marineUrl.searchParams.set('latitude', latitude);
    marineUrl.searchParams.set('longitude', longitude);
    marineUrl.searchParams.set('hourly', 'wave_height,swell_wave_height,wind_wave_height,wave_direction,swell_wave_direction,wave_period,swell_wave_period');
    marineUrl.searchParams.set('timezone', 'Europe/London');
    marineUrl.searchParams.set('forecast_days', '1');

    // Wind data
    const windUrl = new URL('https://api.open-meteo.com/v1/forecast');
    windUrl.searchParams.set('latitude', latitude);
    windUrl.searchParams.set('longitude', longitude);
    windUrl.searchParams.set('hourly', 'wind_speed_10m,wind_direction_10m');
    windUrl.searchParams.set('timezone', 'Europe/London');
    windUrl.searchParams.set('forecast_days', '1');

    const [marineResponse, windResponse] = await Promise.all([
      fetch(marineUrl),
      fetch(windUrl)
    ]);

    const marineData = await marineResponse.json();
    const windData = await windResponse.json();

    // Get current hour index
    const now = new Date();
    const currentHourStr = now.toISOString().slice(0, 13) + ':00';
    
    const times = marineData.hourly?.time || [];
    let currentIdx = 0;
    
    for (let i = 0; i < times.length; i++) {
      if (times[i] <= currentHourStr) {
        currentIdx = i;
      } else {
        break;
      }
    }

    return {
      waveHeight: marineData.hourly?.wave_height?.[currentIdx],
      swellWaveHeight: marineData.hourly?.swell_wave_height?.[currentIdx],
      windWaveHeight: marineData.hourly?.wind_wave_height?.[currentIdx],
      waveDirection: marineData.hourly?.wave_direction?.[currentIdx],
      swellWaveDirection: marineData.hourly?.swell_wave_direction?.[currentIdx],
      wavePeriod: marineData.hourly?.wave_period?.[currentIdx],
      swellWavePeriod: marineData.hourly?.swell_wave_period?.[currentIdx],
      windSpeed: windData.hourly?.wind_speed_10m?.[currentIdx],
      windDirection: windData.hourly?.wind_direction_10m?.[currentIdx],
      timestamp: times[currentIdx]
    };
  } catch (error) {
    console.error('Error fetching conditions:', error);
    return null;
  }
}

function calculateSurfScore(conditions, spot) {
  if (!conditions) return { score: 0, description: "No data available" };
  
  let score = 0;
  const factors = [];
  
  // Wave height scoring (0-4 points) - More weight given to this key factor
  const waveHeight = conditions.waveHeight || 0;
  const swellHeight = conditions.swellWaveHeight || 0;
  const effectiveHeight = Math.max(waveHeight, swellHeight);
  
  let heightScore;
  // Skill level adjusted scoring
  const isBeginnerSpot = spot.skillLevel?.toLowerCase().includes('beginner');
  const isAdvancedSpot = spot.skillLevel?.toLowerCase().includes('advanced');
  
  if (isBeginnerSpot) {
    // Beginners prefer smaller, manageable waves
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
    // Advanced spots can handle bigger waves
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
    // Intermediate spots - balanced approach
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
  
  // Wave period scoring (0-2.5 points) - Enhanced importance
  const period = conditions.swellWavePeriod || conditions.wavePeriod || 0;
  let periodScore;
  if (period >= 10 && period <= 14) {
    periodScore = 2.5;
    factors.push("Premium groundswell");
  } else if (period >= 8 && period < 10) {
    periodScore = 2;
    factors.push("Good groundswell");
  } else if ((period >= 6 && period < 8) || (period > 14 && period <= 18)) {
    periodScore = 1.5;
    factors.push("Decent swell period");
  } else if (period >= 4 && period < 6) {
    periodScore = 0.8;
    factors.push("Short period windswell");
  } else if (period > 0) {
    periodScore = 0.3;
    factors.push("Very short period");
  } else {
    periodScore = 0;
  }
  score += periodScore;
  
  // Swell direction scoring (0-2.5 points) - Slightly reduced weight
  const swellDir = conditions.swellWaveDirection || conditions.waveDirection;
  if (swellDir && spot.optimalSwellDir) {
    const swellScoreFactor = directionScore(swellDir, spot.optimalSwellDir);
    const swellScore = 2.5 * swellScoreFactor;
    score += swellScore;
    
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
    factors.push("Unknown swell direction");
  }
  
  // Wind direction scoring (0-2 points) - Enhanced wind assessment
  const windSpeed = conditions.windSpeed || 0;
  const windDir = conditions.windDirection;
  
  if (windSpeed <= 8) {
    score += 2;
    factors.push("Light winds - glassy conditions");
  } else if (windDir && spot.optimalWindDir) {
    const windScoreFactor = directionScore(windDir, spot.optimalWindDir);
    
    if (windSpeed <= 15) {
      const windScore = 2 * windScoreFactor;
      score += windScore;
      
      if (windScoreFactor >= 0.9) {
        factors.push("Perfect offshore winds!");
      } else if (windScoreFactor >= 0.7) {
        factors.push("Good offshore wind");
      } else if (windScoreFactor >= 0.3) {
        factors.push("Side/cross winds");
      } else {
        factors.push("Onshore winds - bumpy");
      }
    } else if (windSpeed <= 25) {
      score += windScoreFactor * 0.8;
      factors.push("Strong winds");
    } else {
      score += 0.2;
      factors.push("Very strong winds");
    }
  } else {
    score += 1;
    factors.push("Unknown wind conditions");
  }
  
  // Generate description with enhanced thresholds
  let description;
  if (score >= 8.5) {
    description = `🔥 FIRING! Epic conditions at ${spot.name}. ${factors.join(", ")}`;
  } else if (score >= 7) {
    description = `🌊 Excellent surf at ${spot.name}. ${factors.join(", ")}`;
  } else if (score >= 5.5) {
    description = `👍 Good session potential at ${spot.name}. ${factors.join(", ")}`;
  } else if (score >= 4) {
    description = `⚠️ Average conditions. ${factors.join(", ")}`;
  } else if (score >= 2) {
    description = `😐 Below average conditions. ${factors.join(", ")}`;
  } else {
    description = `💤 Poor conditions. ${factors.join(", ")}`;
  }
  
  // Reliability bonus (0-1 points)
  let reliabilityBonus = 0;
  if (spot.reliability) {
    const reliability = spot.reliability.toLowerCase();
    if (reliability.includes('very consistent')) {
      reliabilityBonus = 1;
      factors.push("Very reliable spot");
    } else if (reliability.includes('consistent')) {
      reliabilityBonus = 0.7;
      factors.push("Reliable spot");
    } else if (reliability.includes('seasonal')) {
      reliabilityBonus = 0.3;
      factors.push("Seasonal reliability");
    }
  }
  score += reliabilityBonus;
  
  return { score: Math.round(score * 10) / 10, description };
}

exports.handler = async (event, context) => {
  console.log('Function called:', event.httpMethod, event.path);
  
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
    const { latitude, longitude, maxDistance = 100 } = JSON.parse(event.body || '{}'); // 100km = ~62 miles
    
    if (!latitude || !longitude) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Latitude and longitude are required' })
      };
    }

    // Find nearby spots
    const nearbySpots = surfSpotsData
      .map(spot => ({
        ...spot,
        distance: calculateDistance(latitude, longitude, spot.latitude, spot.longitude)
      }))
      .filter(spot => spot.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance);

    if (nearbySpots.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ spots: [], message: 'No surf spots found nearby' })
      };
    }

    // Get conditions for each spot
    const spotsWithConditions = await Promise.all(
      nearbySpots.map(async (spot) => {
        const conditions = await getSurfConditions(spot.latitude, spot.longitude);
        const { score, description } = calculateSurfScore(conditions, spot);
        
        return {
          ...spot,
          conditions,
          surfScore: score,
          surfDescription: description,
          waveHeight: conditions?.waveHeight || 0,
          windSpeed: conditions?.windSpeed || 0
        };
      })
    );

    // Sort by surf score
    spotsWithConditions.sort((a, b) => b.surfScore - a.surfScore);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        spots: spotsWithConditions.slice(0, 10), // Top 10 spots within 100km
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