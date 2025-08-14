// app/data/surfSpots.json
export const surfSpots = [
  {
    name: 'Fistral Beach',
    latitude: 50.4161,
    longitude: -5.0931,
    region: 'Cornwall',
    skillLevel: 'Intermediate',
    optimalSwellDir: [270, 300],
    optimalWindDir: [45, 135],
    faces: 'N',
    bestTide: 'mid',
    description: 'Consistent beach break, works in most swells'
  },
  {
    name: 'Watergate Bay',
    latitude: 50.4425,
    longitude: -5.0394,
    region: 'Cornwall',
    skillLevel: 'Beginner',
    optimalSwellDir: [270, 315],
    optimalWindDir: [90, 180],
    faces: 'NW',
    bestTide: 'low_to_mid',
    description: 'Long sandy beach, good for beginners'
  },
  {
    name: 'Polzeath',
    latitude: 50.5689,
    longitude: -4.9156,
    region: 'Cornwall',
    skillLevel: 'Beginner',
    optimalSwellDir: [270, 330],
    optimalWindDir: [135, 225],
    faces: 'NW',
    bestTide: 'mid_to_high',
    description: 'Protected bay, good for learning'
  },
  {
    name: 'Croyde Bay',
    latitude: 51.1261,
    longitude: -4.2394,
    region: 'Devon',
    skillLevel: 'Beginner',
    optimalSwellDir: [270, 330],
    optimalWindDir: [90, 180],
    faces: 'NW',
    bestTide: 'mid',
    description: 'Consistent beach break in pretty bay'
  },
  {
    name: 'Woolacombe',
    latitude: 51.1833,
    longitude: -4.2167,
    region: 'Devon',
    skillLevel: 'Beginner',
    optimalSwellDir: [270, 330],
    optimalWindDir: [90, 180],
    faces: 'NW',
    bestTide: 'all',
    description: 'Long beach, good for all abilities'
  },
  {
    name: 'Rhossili Bay',
    latitude: 51.5611,
    longitude: -4.3181,
    region: 'Wales',
    skillLevel: 'Intermediate',
    optimalSwellDir: [225, 315],
    optimalWindDir: [45, 135],
    faces: 'SW',
    bestTide: 'low_to_mid',
    description: 'Beautiful bay with consistent surf'
  },
  {
    name: 'Thurso East',
    latitude: 58.6,
    longitude: -3.5167,
    region: 'Scotland',
    skillLevel: 'Advanced',
    optimalSwellDir: [315, 45],
    optimalWindDir: [135, 225],
    faces: 'N',
    bestTide: 'mid_to_high',
    description: 'World-class right-hand reef break'
  }
];

// netlify/functions/find-surf-spots.js
const { surfSpots } = require('../../app/data/surfSpots.json');

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
  
  // Wave height scoring (0-3 points)
  const waveHeight = conditions.waveHeight || 0;
  const swellHeight = conditions.swellWaveHeight || 0;
  const effectiveHeight = Math.max(waveHeight, swellHeight);
  
  let heightScore;
  if (effectiveHeight >= 0.5 && effectiveHeight <= 2.5) {
    heightScore = 3;
    factors.push("Good wave size");
  } else if (effectiveHeight > 2.5 && effectiveHeight <= 4) {
    heightScore = 2.5;
    factors.push("Large waves");
  } else if (effectiveHeight >= 0.3 && effectiveHeight < 0.5) {
    heightScore = 1.5;
    factors.push("Small but rideable");
  } else if (effectiveHeight > 4) {
    heightScore = 1;
    factors.push("Very large waves");
  } else {
    heightScore = 0;
    factors.push("Too small");
  }
  score += heightScore;
  
  // Wave period scoring (0-2 points)
  const period = conditions.swellWavePeriod || conditions.wavePeriod || 0;
  let periodScore;
  if (period >= 8 && period <= 16) {
    periodScore = 2;
    factors.push("Clean groundswell");
  } else if ((period >= 6 && period < 8) || (period > 16 && period <= 20)) {
    periodScore = 1.5;
    factors.push("Decent period");
  } else if (period > 0) {
    periodScore = 0.5;
    factors.push("Short period waves");
  } else {
    periodScore = 0;
  }
  score += periodScore;
  
  // Swell direction scoring (0-3 points)
  const swellDir = conditions.swellWaveDirection || conditions.waveDirection;
  if (swellDir && spot.optimalSwellDir) {
    const swellScoreFactor = directionScore(swellDir, spot.optimalSwellDir);
    const swellScore = 3 * swellScoreFactor;
    score += swellScore;
    
    if (swellScoreFactor >= 0.9) {
      factors.push("Perfect swell direction!");
    } else if (swellScoreFactor >= 0.7) {
      factors.push("Good swell direction");
    } else if (swellScoreFactor >= 0.5) {
      factors.push("Okay swell direction");
    } else {
      factors.push("Poor swell direction");
    }
  } else {
    score += 1.5;
    factors.push("Unknown swell direction");
  }
  
  // Wind direction scoring (0-2 points)
  const windSpeed = conditions.windSpeed || 0;
  const windDir = conditions.windDirection;
  
  if (windSpeed <= 5) {
    score += 2;
    factors.push("Light winds");
  } else if (windDir && spot.optimalWindDir) {
    const windScoreFactor = directionScore(windDir, spot.optimalWindDir);
    
    if (windSpeed <= 15) {
      const windScore = 2 * windScoreFactor;
      score += windScore;
      
      if (windScoreFactor >= 0.9) {
        factors.push("Perfect offshore winds!");
      } else if (windScoreFactor >= 0.7) {
        factors.push("Good wind direction");
      } else {
        factors.push("Suboptimal wind direction");
      }
    } else {
      score += windScoreFactor;
      factors.push("Strong winds");
    }
  } else {
    score += 1;
    factors.push("Unknown wind");
  }
  
  // Generate description
  let description;
  if (score >= 8) {
    description = `🔥 FIRING! Perfect for ${spot.faces}-facing ${spot.name}. ${factors.join(", ")}`;
  } else if (score >= 6.5) {
    description = `🌊 Excellent conditions at ${spot.name}. ${factors.join(", ")}`;
  } else if (score >= 5) {
    description = `👍 Good session potential. ${factors.join(", ")}`;
  } else if (score >= 3) {
    description = `⚠️ Average conditions. ${factors.join(", ")}`;
  } else if (score >= 1.5) {
    description = `😐 Poor conditions. ${factors.join(", ")}`;
  } else {
    description = `💤 Very poor conditions. ${factors.join(", ")}`;
  }
  
  return { score: Math.round(score * 10) / 10, description };
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
    const { latitude, longitude, maxDistance = 150 } = JSON.parse(event.body || '{}');
    
    if (!latitude || !longitude) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Latitude and longitude are required' })
      };
    }

    // Find nearby spots
    const nearbySpots = surfSpots
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
          description,
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
        spots: spotsWithConditions.slice(0, 5), // Top 5 spots
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

// app/routes/_index.tsx
import { useState, useEffect } from 'react';
import type { MetaFunction } from '@remix-run/node';

export const meta: MetaFunction = () => {
  return [
    { title: 'UK Surf Finder' },
    { name: 'description', content: 'Find the best surf spots near you right now!' },
  ];
};

export default function Index() {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [spots, setSpots] = useState([]);
  const [error, setError] = useState('');

  const getLocation = () => {
    setLoading(true);
    setError('');
    
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
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
        setError('Unable to get your location. Please enable location services.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const findSurfSpots = async (latitude, longitude) => {
    try {
      const response = await fetch('/.netlify/functions/find-surf-spots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude, maxDistance: 150 })
      });

      const data = await response.json();
      
      if (response.ok) {
        setSpots(data.spots);
      } else {
        setError(data.error || 'Failed to find surf spots');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 8) return 'text-green-600 font-bold';
    if (score >= 6.5) return 'text-green-500';
    if (score >= 5) return 'text-yellow-500';
    if (score >= 3) return 'text-orange-500';
    return 'text-red-500';
  };

  const getScoreEmoji = (score) => {
    if (score >= 8) return '🔥';
    if (score >= 6.5) return '🌊';
    if (score >= 5) return '👍';
    if (score >= 3) return '⚠️';
    if (score >= 1.5) return '😐';
    return '💤';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🏄‍♂️ UK Surf Finder
          </h1>
          <p className="text-lg text-gray-600">
            Find the best surf spots near you right now
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {!location && (
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <div className="mb-6">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                  Ready to find epic surf?
                </h2>
                <p className="text-gray-600 mb-6">
                  We'll find the best surf spots near your location and check current conditions
                </p>
              </div>
              
              <button
                onClick={getLocation}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition duration-200 disabled:opacity-50"
              >
                {loading ? 'Getting Location...' : 'Find Surf Spots Near Me'}
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
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-semibold text-gray-800">
                    🌊 Top Surf Spots Near You
                  </h2>
                  <button
                    onClick={() => findSurfSpots(location.latitude, location.longitude)}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200 disabled:opacity-50"
                  >
                    {loading ? 'Updating...' : 'Refresh'}
                  </button>
                </div>
                
                <p className="text-gray-600 mb-6">
                  Location: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                </p>

                {loading && (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-gray-600">Checking surf conditions...</p>
                  </div>
                )}

                {spots.length > 0 && (
                  <div className="grid gap-4">
                    {spots.map((spot, index) => (
                      <div
                        key={spot.name}
                        className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-6 border border-blue-200"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-xl font-semibold text-gray-800">
                              #{index + 1} {spot.name}
                            </h3>
                            <p className="text-gray-600">
                              {spot.region} • {spot.distance.toFixed(1)}km away • {spot.skillLevel}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className={`text-2xl ${getScoreColor(spot.surfScore)}`}>
                              {getScoreEmoji(spot.surfScore)} {spot.surfScore}/10
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                          <div className="bg-white rounded-lg p-3">
                            <div className="text-gray-500">Wave Height</div>
                            <div className="font-semibold text-blue-600">
                              {spot.waveHeight?.toFixed(1) || '0'}m
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-3">
                            <div className="text-gray-500">Wind Speed</div>
                            <div className="font-semibold text-green-600">
                              {spot.windSpeed?.toFixed(1) || '0'} km/h
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-3">
                            <div className="text-gray-500">Period</div>
                            <div className="font-semibold text-purple-600">
                              {spot.conditions?.swellWavePeriod?.toFixed(1) || 
                               spot.conditions?.wavePeriod?.toFixed(1) || '0'}s
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-3">
                            <div className="text-gray-500">Best Tide</div>
                            <div className="font-semibold text-orange-600 capitalize">
                              {spot.bestTide?.replace('_', '-') || 'Any'}
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-gray-700 bg-white rounded-lg p-3">
                          {spot.description}
                        </p>
                        
                        <div className="mt-4 flex space-x-3">
                          <button
                            onClick={() => window.open(`https://maps.google.com/maps?q=${spot.latitude},${spot.longitude}`, '_blank')}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200"
                          >
                            📍 Get Directions
                          </button>
                          <button
                            onClick={() => window.open(`https://www.surf-forecast.com/breaks/${spot.name.toLowerCase().replace(/\s+/g, '-')}`, '_blank')}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition duration-200"
                          >
                            📊 Detailed Forecast
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {spots.length === 0 && !loading && location && (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No surf spots found nearby. Try increasing the search distance.</p>
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

// package.json additions for dependencies
/*
{
  "dependencies": {
    "@remix-run/node": "^2.0.0",
    "@remix-run/react": "^2.0.0",
    "@remix-run/serve": "^2.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "scripts": {
    "build": "remix build",
    "dev": "remix dev",
    "start": "remix-serve build"
  }
}
*/

// netlify.toml
/*
[build]
  command = "npm run build"
  functions = "netlify/functions"
  publish = "build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
*/