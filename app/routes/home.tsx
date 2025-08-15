import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { Route } from "./+types/home";
import surfSpotsData from "../data/surfSpots.json";
import TideGraph from '../components/TideGraph';
import HourlySurfChart from '../components/HourlySurfChart';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'UK Surf Finder' },
    { name: 'description', content: 'Find the best surf spots near you right now!' },
  ];
}

export default function Home() {
  const navigate = useNavigate();
  const [location, setLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [loading, setLoading] = useState(false);
  const [spots, setSpots] = useState<any[]>([]);
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

  // Calculate distance between two points
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
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
  };

  const findSurfSpots = async (latitude: number, longitude: number) => {
    try {
      // Try Netlify function first
      try {
        const response = await fetch('/.netlify/functions/find-surf-spots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ latitude, longitude, maxDistance: 100 }) // 100km
        });

        const data = await response.json();
        
        if (response.ok) {
          setSpots(data.spots);
          return;
        }
      } catch (networkError) {
        console.log('Netlify function not available, using local data');
      }

      // Fallback to local data processing with consistent mock data
      const mockSeed = latitude + longitude; // Use location as seed for consistent results
      const nearbySpots = surfSpotsData
        .map((spot, index) => {
          // Generate consistent mock data based on spot and location
          const spotSeed = mockSeed + index * 37; // Simple pseudo-random based on position
          const seededRandom = (seed: number) => {
            const x = Math.sin(seed) * 10000;
            return x - Math.floor(x);
          };
          
          const mockWaveHeight = 0.3 + seededRandom(spotSeed * 1.3) * 2.2;
          const mockPeriod = 6 + seededRandom(spotSeed * 1.9) * 8; // 6-14s
          const mockWindSpeed = seededRandom(spotSeed * 1.7) * 25;
          const mockTideLevel = seededRandom(spotSeed * 2.7); // 0-1 scale
          const mockTideRising = seededRandom(spotSeed * 3.1) > 0.5;
          
          return {
            ...spot,
            distance: calculateDistance(latitude, longitude, spot.latitude, spot.longitude),
            surfScore: 3 + seededRandom(spotSeed * 1.1) * 6, // Consistent score 3-9
            waveHeight: mockWaveHeight,
            windSpeed: mockWindSpeed,
            tideData: {
              currentLevel: mockTideLevel,
              isRising: mockTideRising,
              nextHigh: new Date(Date.now() + (mockTideRising ? 3 : 9) * 3600000), // 3-9 hours from now
              nextLow: new Date(Date.now() + (mockTideRising ? 9 : 3) * 3600000)
            },
            conditions: {
              waveHeight: mockWaveHeight,
              swellWaveHeight: mockWaveHeight * 0.8,
              swellWavePeriod: mockPeriod,
              wavePeriod: mockPeriod,
              windSpeed: mockWindSpeed,
              windDirection: 90 + seededRandom(spotSeed * 2.1) * 180, // 90-270 degrees
              swellWaveDirection: 270 + seededRandom(spotSeed * 2.3) * 90, // 270-360 degrees
              timestamp: new Date().toISOString(),
              tideData: {
                currentLevel: mockTideLevel,
                isRising: mockTideRising,
                nextHigh: new Date(Date.now() + (mockTideRising ? 3 : 9) * 3600000),
                nextLow: new Date(Date.now() + (mockTideRising ? 9 : 3) * 3600000)
              }
            },
            surfDescription: `🔄 Mock data: ${spot.reliability} conditions at ${spot.name}. Live weather data loading...`
          };
        })
        .filter(spot => spot.distance <= 100) // 100km
        .sort((a, b) => b.surfScore - a.surfScore) // Sort by score, not distance
        .slice(0, 10);

      setSpots(nearbySpots);
    } catch (err) {
      setError('Error finding surf spots. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 font-bold';
    if (score >= 6.5) return 'text-green-500';
    if (score >= 5) return 'text-yellow-500';
    if (score >= 3) return 'text-orange-500';
    return 'text-red-500';
  };

  const getScoreEmoji = (score: number) => {
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
          <div className="mt-4">
            <a 
              href="/spots" 
              className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
            >
              📋 Browse All UK Spots
            </a>
          </div>
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
                  We'll find the best surf spots within 100km and check current conditions
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
                        
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4 text-sm">
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
                          <div className="bg-white rounded-lg p-3">
                            <div className="text-gray-500">Current Tide</div>
                            <div className="font-semibold text-cyan-600">
                              {spot.tideData ? (
                                <>
                                  {(spot.tideData.currentLevel * 100).toFixed(0)}%
                                  {spot.tideData.isRising ? ' ↗️' : ' ↘️'}
                                </>
                              ) : '🔄 Mock'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          {/* Compact Tide Graph */}
                          <div className="bg-gray-50 rounded-lg p-3">
                            <TideGraph 
                              tideData={spot.tideData} 
                              showHours={24} 
                              height="120px" 
                              className="border-0 bg-transparent"
                              latitude={spot.latitude}
                              longitude={spot.longitude}
                              variant="compact"
                            />
                          </div>

                          {/* Hourly Surf Conditions */}
                          <div className="bg-blue-50 rounded-lg p-3">
                            <HourlySurfChart 
                              data={spot.hourlyData}
                              height="100px"
                              className="border-0 bg-transparent"
                              variant="compact"
                            />
                          </div>

                          <p className="text-gray-700 bg-white rounded-lg p-3">
                            <strong>Description:</strong> {spot.description}
                          </p>
                          
                          {spot.bestConditions && (
                            <p className="text-gray-700 bg-green-50 rounded-lg p-3">
                              <strong>Optimal Conditions:</strong> {spot.bestConditions}
                            </p>
                          )}
                          
                          {spot.surfDescription && (
                            <p className="text-gray-700 bg-blue-50 rounded-lg p-3">
                              <strong>Current Assessment:</strong> {spot.surfDescription}
                            </p>
                          )}
                          
                          <div className="flex flex-wrap gap-2 text-sm">
                            {spot.reliability && (
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                                {spot.reliability}
                              </span>
                            )}
                            {spot.breakType && (
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {spot.breakType} break
                              </span>
                            )}
                            {spot.hazards && (
                              <span className="bg-red-100 text-red-800 px-2 py-1 rounded">
                                ⚠️ {spot.hazards}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="mt-4 flex space-x-3">
                          <button
                            onClick={() => window.open(`https://maps.google.com/maps?q=${spot.latitude},${spot.longitude}`, '_blank')}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200"
                          >
                            📍 Get Directions
                          </button>
                          <button
                            onClick={() => navigate(`/forecast/${spot.name.replace(/\s+/g, '-').toLowerCase()}?lat=${spot.latitude}&lng=${spot.longitude}`)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition duration-200"
                          >
                            📊 5-Day Forecast
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
