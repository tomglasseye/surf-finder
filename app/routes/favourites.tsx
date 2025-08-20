import { useNavigate } from 'react-router';
import { useFavorites } from "../hooks/useFavorites";

export function meta() {
  return [
    { title: 'Favourite Surf Spots - Surf Finder' },
    { name: 'description', content: 'Your favourite UK surf spots with quick access to forecasts' },
  ];
}

export default function Favourites() {
  const navigate = useNavigate();
  const { favorites, removeSpotFromFavorites } = useFavorites();

  const handleRemoveFavourite = (spotName: string) => {
    removeSpotFromFavorites(spotName);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="px-2 md:px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-black mb-2">
            Favourite Surf Spots
          </h1>
          <p className="text-lg text-gray-700">
            {favorites.length > 0 
              ? `You have ${favorites.length} favourite spot${favorites.length !== 1 ? 's' : ''}`
              : 'No favourite spots saved yet'
            }
          </p>
          <div className="mt-4">
            <a 
              href="/" 
              className="bg-black hover:bg-gray-800 text-white font-semibold py-2 px-4 border transition duration-200"
            >
              ← Back to Surf Finder
            </a>
          </div>
        </div>

        <div className="max-w-none">
          {favorites.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {favorites.map((spot) => (
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
                    <p className="text-xs text-gray-500">
                      Added {new Date(spot.addedAt).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="mt-4 flex space-x-2">
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
                      Forecast
                    </button>
                    <button
                      onClick={() => handleRemoveFavourite(spot.name)}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-2 border text-xs transition duration-200"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="bg-white border border-gray-200 p-8 inline-block">
                <h2 className="text-xl font-semibold text-black mb-4">
                  No favourites yet
                </h2>
                <p className="text-gray-600 mb-6">
                  Start adding spots to your favourites by using the finder or browsing all spots
                </p>
                <div className="space-x-4">
                  <a 
                    href="/" 
                    className="bg-black hover:bg-gray-800 text-white px-4 py-2 border transition duration-200 inline-block"
                  >
                    Find Spots
                  </a>
                  <a 
                    href="/spots" 
                    className="bg-white hover:bg-gray-50 text-black px-4 py-2 border border-black transition duration-200 inline-block"
                  >
                    Browse All Spots
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}