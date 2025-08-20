import { useNavigate } from 'react-router';
import type { Route } from "./+types/spots";
import surfSpotsData from "../data/surfSpots.json";
import { useFavorites } from "../hooks/useFavorites";

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'All Surf Spots - Surf Finder' },
    { name: 'description', content: 'Browse all UK surf spots with detailed information and conditions' },
  ];
}

export default function Spots() {
  const navigate = useNavigate();
  const { toggleSpotFavorite, isSpotFavorited } = useFavorites();
  // Group spots by region
  const spotsByRegion = surfSpotsData.reduce((acc, spot) => {
    const region = spot.region;
    if (!acc[region]) {
      acc[region] = [];
    }
    acc[region].push(spot);
    return acc;
  }, {} as Record<string, typeof surfSpotsData>);

  const getSkillColor = (skillLevel: string) => {
    switch (skillLevel.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getReliabilityColor = (reliability: string) => {
    switch (reliability.toLowerCase()) {
      case 'very consistent': return 'bg-green-100 text-green-800';
      case 'consistent': return 'bg-blue-100 text-blue-800';
      case 'seasonal': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="px-2 md:px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-black mb-2">
            All Surf Spots
          </h1>
          <p className="text-lg text-gray-700">
            Comprehensive guide to {surfSpotsData.length} premium UK surf locations
          </p>
          <div className="mt-4 flex justify-center space-x-3">
            <a 
              href="/" 
              className="bg-black hover:bg-gray-800 text-white font-semibold py-2 px-4 border transition duration-200"
            >
              ← Back to Surf Finder
            </a>
            <a 
              href="/favourites" 
              className="bg-white hover:bg-gray-50 text-black font-semibold py-2 px-4 border border-black transition duration-200"
            >
              Favourites
            </a>
          </div>
        </div>

        <div className="max-w-none">
          {Object.entries(spotsByRegion).map(([region, spots]) => (
            <div key={region} className="mb-12">
              <h2 className="text-2xl font-bold text-black mb-6 border-b-2 border-gray-200 pb-2">
                {region} ({spots.length} spots)
              </h2>
              
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {spots.map((spot) => (
                  <div 
                    key={spot.name}
                    className="bg-white border border-gray-200 p-6 hover:border-gray-300 transition-colors duration-200"
                  >
                    <div className="mb-4">
                      <h3 className="text-xl font-semibold text-black mb-2">
                        {spot.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        {spot.latitude.toFixed(4)}, {spot.longitude.toFixed(4)}
                      </p>
                      
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getSkillColor(spot.skillLevel)}`}>
                          {spot.skillLevel}
                        </span>
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                          {spot.breakType} break
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getReliabilityColor(spot.reliability)}`}>
                          {spot.reliability}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-gray-700 text-sm mb-4 line-clamp-3">
                      {spot.description}
                    </p>
                    
                    {spot.bestConditions && (
                      <div className="mb-4">
                        <p className="text-xs font-medium text-gray-600 mb-1">Best Conditions:</p>
                        <p className="text-xs text-gray-700 bg-green-50 p-2 rounded">
                          {spot.bestConditions}
                        </p>
                      </div>
                    )}
                    
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Best Tide:</span>
                        <span className="text-gray-700 capitalize">
                          {spot.bestTide?.replace('_', '-') || 'Any'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Faces:</span>
                        <span className="text-gray-700">{spot.faces}</span>
                      </div>
                      {spot.hazards && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Hazards:</span>
                          <span className="text-red-600">⚠️ {spot.hazards}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-4 flex space-x-2">
                      <button
                        onClick={() => toggleSpotFavorite({
                          name: spot.name,
                          latitude: spot.latitude,
                          longitude: spot.longitude,
                          region: spot.region
                        })}
                        className={`px-2 py-2 border text-xs transition duration-200 ${
                          isSpotFavorited(spot.name)
                            ? "bg-black hover:bg-gray-800 text-white border-black"
                            : "bg-white hover:bg-gray-50 text-black border-black"
                        }`}
                      >
                        {isSpotFavorited(spot.name) ? "★" : "☆"}
                      </button>
                      <button
                        onClick={() => window.open(`https://maps.google.com/maps?q=${spot.latitude},${spot.longitude}`, '_blank')}
                        className="flex-1 bg-black hover:bg-gray-800 text-white px-3 py-2 border text-xs transition duration-200"
                      >
                        Maps
                      </button>
                      <button
                        onClick={() => navigate(`/forecast/${spot.name.replace(/\s+/g, '-').toLowerCase()}?lat=${spot.latitude}&lng=${spot.longitude}`)}
                        className="flex-1 bg-white hover:bg-gray-50 text-black px-3 py-2 border border-black text-xs transition duration-200"
                      >
                        5-Day Forecast
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-center mt-12 p-6 bg-white border border-gray-200 max-w-2xl mx-auto">
          <h3 className="text-lg font-semibold text-black mb-2">
            Surf Spot Statistics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-black">{surfSpotsData.length}</div>
              <div className="text-gray-600">Total Spots</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">
                {surfSpotsData.filter(s => s.skillLevel === 'Beginner').length}
              </div>
              <div className="text-gray-600">Beginner</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {surfSpotsData.filter(s => s.skillLevel === 'Intermediate').length}
              </div>
              <div className="text-gray-600">Intermediate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-400">
                {surfSpotsData.filter(s => s.skillLevel === 'Advanced').length}
              </div>
              <div className="text-gray-600">Advanced</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}