interface TideData {
  currentLevel: number; // 0-1 scale
  isRising: boolean;
  nextHigh: Date;
  nextLow: Date;
}

interface TideGraphProps {
  tideData?: TideData | null;
  showHours?: number; // How many hours to show (default 24)
  height?: string; // CSS height (default '200px')
  className?: string;
  latitude?: number; // For sunrise/sunset calculation
  longitude?: number; // For sunrise/sunset calculation
  variant?: 'full' | 'compact' | 'daily'; // Display variant
  date?: Date; // Specific date for daily view
}

export default function TideGraph({ 
  tideData, 
  showHours = 24, 
  height = '200px',
  className = '',
  latitude = 50.4, // Default to Cornwall
  longitude = -5.0,
  variant = 'full',
  date
}: TideGraphProps) {
  // Calculate sunrise and sunset times
  const calculateSunTimes = (date: Date) => {
    // Simplified sunrise/sunset calculation (approximation)
    // For production, you'd want to use a proper library like suncalc
    const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
    const p = Math.asin(0.39795 * Math.cos(0.98563 * (dayOfYear - 173) * Math.PI / 180));
    const a = (Math.sin(-0.83 * Math.PI / 180) - Math.sin(latitude * Math.PI / 180) * Math.sin(p)) / (Math.cos(latitude * Math.PI / 180) * Math.cos(p));
    
    // Handle polar day/night scenarios
    if (Math.abs(a) > 1) {
      return {
        sunrise: Math.abs(a) > 1 && a > 0 ? null : new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0),
        sunset: Math.abs(a) > 1 && a > 0 ? null : new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59)
      };
    }
    
    const hourAngle = Math.acos(a) * 180 / Math.PI / 15;
    const solarNoon = 12 - longitude / 15;
    
    const sunriseHour = solarNoon - hourAngle;
    const sunsetHour = solarNoon + hourAngle;
    
    const sunrise = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    sunrise.setHours(Math.floor(sunriseHour), (sunriseHour % 1) * 60, 0, 0);
    
    const sunset = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    sunset.setHours(Math.floor(sunsetHour), (sunsetHour % 1) * 60, 0, 0);
    
    return { sunrise, sunset };
  };

  // Generate hourly tide data points
  const generateTidePoints = () => {
    const points = [];
    const now = new Date();
    
    // For daily variant, use specific date; otherwise use current day
    const targetDate = variant === 'daily' && date ? date : now;
    const startTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0); // Start of target day
    
    // If no tide data, use mock/calculated data
    const baseLevel = tideData?.currentLevel || 0.5;
    const lunarCycleMs = 12.42 * 60 * 60 * 1000; // ~12.42 hours between high tides
    const currentTime = now.getTime();
    
    for (let i = 0; i < showHours; i++) {
      const hourTime = startTime.getTime() + (i * 3600000);
      const hourDate = new Date(hourTime);
      
      // Calculate tide level using sinusoidal pattern
      const timeDiff = hourTime - currentTime;
      const cyclePosition = (timeDiff / lunarCycleMs) * 2 * Math.PI;
      const tideLevel = 0.5 + (0.5 * Math.cos(cyclePosition + Math.acos(2 * baseLevel - 1)));
      
      // Clamp between 0 and 1
      const clampedLevel = Math.max(0, Math.min(1, tideLevel));
      
      points.push({
        hour: i,
        time: hourDate,
        level: clampedLevel,
        isNow: i === now.getHours(),
        isHighTide: false, // Will be set below
        isLowTide: false
      });
    }
    
    // Identify high and low tide points
    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const current = points[i];
      const next = points[i + 1];
      
      // High tide: higher than neighbors and above 0.8
      if (current.level > prev.level && current.level > next.level && current.level > 0.8) {
        current.isHighTide = true;
      }
      
      // Low tide: lower than neighbors and below 0.2
      if (current.level < prev.level && current.level < next.level && current.level < 0.2) {
        current.isLowTide = true;
      }
    }
    
    return points;
  };

  const tidePoints = generateTidePoints();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sunTimes = calculateSunTimes(today);
  
  const graphWidth = 100; // SVG viewBox width
  const graphHeight = 100; // SVG viewBox height
  
  // Create SVG path for tide curve
  const createTidePath = () => {
    const pathData = tidePoints.map((point, index) => {
      const x = (index / (showHours - 1)) * graphWidth;
      const y = graphHeight - (point.level * graphHeight);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
    
    return pathData;
  };

  const formatHour = (time: Date) => {
    return time.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const getTideHeight = (level: number) => {
    return `${(level * 100).toFixed(0)}%`;
  };

  return (
    <div className={`bg-white rounded-lg border ${className}`}>
      <div className="p-4">
        {variant !== 'daily' && (
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-800">
              🌊 {showHours}-Hour Tide Chart
            </h4>
            {tideData && (
              <div className="text-sm text-gray-600">
                Current: {getTideHeight(tideData.currentLevel)} {tideData.isRising ? '↗️' : '↘️'}
              </div>
            )}
          </div>
        )}
        
        {variant === 'daily' && (
          <div className="mb-2">
            <h4 className="text-sm font-semibold text-gray-700 text-center">
              Daily Tides {date ? `- ${date.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' })}` : ''}
            </h4>
          </div>
        )}
        
        <div className="relative" style={{ height }}>
          <svg
            viewBox={`0 0 ${graphWidth} ${graphHeight}`}
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            {/* Grid lines */}
            <defs>
              <pattern id="grid" width="10" height="25" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 25" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
              </pattern>
              {/* Daylight gradient */}
              <linearGradient id="daylightGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.3"/>
                <stop offset="100%" stopColor="#fef3c7" stopOpacity="0.1"/>
              </linearGradient>
              {/* Nighttime gradient */}
              <linearGradient id="nightGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" stopOpacity="0.2"/>
                <stop offset="100%" stopColor="#1e293b" stopOpacity="0.05"/>
              </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            {/* Daylight/Nighttime background */}
            {(() => {
              const backgrounds = [];
              const startTime = new Date(now.getTime() - (now.getHours() * 3600000)); // Start of today
              
              if (sunTimes.sunrise && sunTimes.sunset) {
                const sunriseHour = (sunTimes.sunrise.getTime() - startTime.getTime()) / (1000 * 60 * 60);
                const sunsetHour = (sunTimes.sunset.getTime() - startTime.getTime()) / (1000 * 60 * 60);
                
                // Night from start to sunrise
                if (sunriseHour > 0) {
                  const x1 = 0;
                  const x2 = Math.min((sunriseHour / (showHours - 1)) * graphWidth, graphWidth);
                  backgrounds.push(
                    <rect key="night1" x={x1} y="0" width={x2 - x1} height="100%" fill="url(#nightGradient)" />
                  );
                }
                
                // Day from sunrise to sunset
                if (sunriseHour < showHours && sunsetHour > 0) {
                  const x1 = Math.max((sunriseHour / (showHours - 1)) * graphWidth, 0);
                  const x2 = Math.min((sunsetHour / (showHours - 1)) * graphWidth, graphWidth);
                  if (x2 > x1) {
                    backgrounds.push(
                      <rect key="day" x={x1} y="0" width={x2 - x1} height="100%" fill="url(#daylightGradient)" />
                    );
                  }
                }
                
                // Night from sunset to end
                if (sunsetHour < showHours) {
                  const x1 = Math.max((sunsetHour / (showHours - 1)) * graphWidth, 0);
                  const x2 = graphWidth;
                  backgrounds.push(
                    <rect key="night2" x={x1} y="0" width={x2 - x1} height="100%" fill="url(#nightGradient)" />
                  );
                }
              }
              
              return backgrounds;
            })()}
            
            {/* High and Low tide reference lines */}
            <line x1="0" y1="20" x2={graphWidth} y2="20" stroke="#3b82f6" strokeWidth="0.5" strokeDasharray="2,2" />
            <line x1="0" y1="50" x2={graphWidth} y2="50" stroke="#6b7280" strokeWidth="0.5" strokeDasharray="2,2" />
            <line x1="0" y1="80" x2={graphWidth} y2="80" stroke="#3b82f6" strokeWidth="0.5" strokeDasharray="2,2" />
            
            {/* Tide curve */}
            <path
              d={createTidePath()}
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="2"
              className="drop-shadow-sm"
            />
            
            {/* Fill area under curve */}
            <path
              d={`${createTidePath()} L ${graphWidth} ${graphHeight} L 0 ${graphHeight} Z`}
              fill="url(#tideGradient)"
              opacity="0.3"
            />
            
            {/* Gradient definition */}
            <defs>
              <linearGradient id="tideGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.8"/>
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.1"/>
              </linearGradient>
            </defs>
            
            {/* High/Low tide markers */}
            {tidePoints.map((point, index) => {
              const x = (index / (showHours - 1)) * graphWidth;
              const y = graphHeight - (point.level * graphHeight);
              
              if (point.isHighTide) {
                return (
                  <g key={`high-${index}`}>
                    <circle cx={x} cy={y} r="3" fill="#10b981" stroke="white" strokeWidth="1"/>
                    <text x={x} y={y - 8} textAnchor="middle" className="text-xs fill-green-600 font-semibold">
                      H
                    </text>
                  </g>
                );
              }
              
              if (point.isLowTide) {
                return (
                  <g key={`low-${index}`}>
                    <circle cx={x} cy={y} r="3" fill="#ef4444" stroke="white" strokeWidth="1"/>
                    <text x={x} y={y + 15} textAnchor="middle" className="text-xs fill-red-600 font-semibold">
                      L
                    </text>
                  </g>
                );
              }
              
              if (point.isNow) {
                return (
                  <g key={`now-${index}`}>
                    <line x1={x} y1="0" x2={x} y2={graphHeight} stroke="#f59e0b" strokeWidth="2" strokeDasharray="3,3"/>
                    <circle cx={x} cy={y} r="4" fill="#f59e0b" stroke="white" strokeWidth="2"/>
                    <text x={x} y={y - 12} textAnchor="middle" className="text-xs fill-amber-600 font-bold">
                      NOW
                    </text>
                  </g>
                );
              }
              
              return null;
            })}
            
            {/* Sunrise/Sunset markers */}
            {(() => {
              const markers = [];
              const startTime = new Date(now.getTime() - (now.getHours() * 3600000)); // Start of today
              
              if (sunTimes.sunrise) {
                const sunriseHour = (sunTimes.sunrise.getTime() - startTime.getTime()) / (1000 * 60 * 60);
                if (sunriseHour >= 0 && sunriseHour < showHours) {
                  const x = (sunriseHour / (showHours - 1)) * graphWidth;
                  markers.push(
                    <g key="sunrise">
                      <line x1={x} y1="5" x2={x} y2={graphHeight - 5} stroke="#f59e0b" strokeWidth="2" strokeDasharray="4,2"/>
                      <circle cx={x} cy="10" r="6" fill="#f59e0b" stroke="white" strokeWidth="1"/>
                      <text x={x} y="15" textAnchor="middle" className="text-xs fill-amber-600 font-bold">
                        ☀️
                      </text>
                    </g>
                  );
                }
              }
              
              if (sunTimes.sunset) {
                const sunsetHour = (sunTimes.sunset.getTime() - startTime.getTime()) / (1000 * 60 * 60);
                if (sunsetHour >= 0 && sunsetHour < showHours) {
                  const x = (sunsetHour / (showHours - 1)) * graphWidth;
                  markers.push(
                    <g key="sunset">
                      <line x1={x} y1="5" x2={x} y2={graphHeight - 5} stroke="#f97316" strokeWidth="2" strokeDasharray="4,2"/>
                      <circle cx={x} cy="10" r="6" fill="#f97316" stroke="white" strokeWidth="1"/>
                      <text x={x} y="15" textAnchor="middle" className="text-xs fill-orange-600 font-bold">
                        🌅
                      </text>
                    </g>
                  );
                }
              }
              
              return markers;
            })()}
          </svg>
        </div>
        
        {/* Time labels */}
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          {(() => {
            let labelIndices;
            if (variant === 'daily') {
              // More time markers for daily view: every 3 hours
              labelIndices = [0, 3, 6, 9, 12, 15, 18, 21, Math.min(23, showHours - 1)];
            } else if (showHours === 12) {
              labelIndices = [0, 3, 6, 9, 11];
            } else {
              labelIndices = [0, 6, 12, 18, Math.min(23, showHours - 1)];
            }
            
            return labelIndices.map(hour => {
              const point = tidePoints[hour];
              if (!point) return null; // Safety check
              return (
                <div key={hour} className="text-center">
                  <div>{formatHour(point.time)}</div>
                  <div className="text-blue-600 font-medium">
                    {getTideHeight(point.level)}
                  </div>
                </div>
              );
            });
          })()}
        </div>
        
        {/* Legend */}
        {variant === 'daily' ? (
          <div className="mt-2 flex flex-wrap gap-2 justify-center text-xs text-gray-600">
            <span>🟢H</span>
            <span>🔴L</span>
            <span>☀️</span>
            <span>🌅</span>
            {!tideData && <span className="text-orange-600">🔄</span>}
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>High Tide (H)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Low Tide (L)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
              <span>Current Time</span>
            </div>
            <div className="flex items-center gap-1">
              <span>☀️</span>
              <span>Sunrise</span>
            </div>
            <div className="flex items-center gap-1">
              <span>🌅</span>
              <span>Sunset</span>
            </div>
            {!tideData && (
              <div className="text-orange-600">
                🔄 Approximate tide data for development
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}