interface HourlySurfData {
  waveHeight: number[];
  period: number[];
  windSpeed: number[];
  times: string[];
}

interface HourlySurfChartProps {
  data?: HourlySurfData | null;
  height?: string;
  className?: string;
  variant?: 'full' | 'compact';
  date?: Date;
}

export default function HourlySurfChart({ 
  data, 
  height = '150px',
  className = '',
  variant = 'full',
  date
}: HourlySurfChartProps) {
  
  // Generate mock hourly data if no real data provided
  const generateMockData = (): HourlySurfData => {
    const times = [];
    const waveHeight = [];
    const period = [];
    const windSpeed = [];
    
    const baseDate = date || new Date();
    const startOfDay = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
    
    for (let hour = 0; hour < 24; hour++) {
      const time = new Date(startOfDay.getTime() + hour * 3600000);
      times.push(time.toISOString());
      
      // Generate realistic surf data curves
      const dayProgress = hour / 24;
      const waveBase = 0.8 + Math.sin(dayProgress * Math.PI * 2 + Math.PI/3) * 0.6;
      const periodBase = 8 + Math.sin(dayProgress * Math.PI * 2 + Math.PI/2) * 3;
      const windBase = 5 + Math.sin(dayProgress * Math.PI * 2) * 8 + Math.random() * 3;
      
      waveHeight.push(Math.max(0.2, waveBase + Math.random() * 0.4));
      period.push(Math.max(4, periodBase + Math.random() * 2));
      windSpeed.push(Math.max(0, windBase));
    }
    
    return { waveHeight, period, windSpeed, times };
  };

  const surfData = data || generateMockData();
  const graphWidth = 100;
  const graphHeight = 80;

  // Create paths for each metric
  const createPath = (values: number[], maxValue: number) => {
    const normalizedValues = values.map(v => Math.min(v / maxValue, 1));
    const pathData = normalizedValues.map((value, index) => {
      const x = (index / (values.length - 1)) * graphWidth;
      const y = graphHeight - (value * graphHeight * 0.8) - (graphHeight * 0.1); // Leave 10% margin top/bottom
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
    
    return pathData;
  };

  const maxWave = Math.max(...surfData.waveHeight) * 1.2;
  const maxPeriod = Math.max(...surfData.period) * 1.1;
  const maxWind = Math.max(...surfData.windSpeed) * 1.1;

  const formatTime = (timeString: string) => {
    const time = new Date(timeString);
    return time.getHours().toString().padStart(2, '0') + ':00';
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg border-0 ${className}`}>
      <div className="p-4">
        {variant === 'full' && (
          <div className="mb-4">
            <h4 className="text-lg font-semibold text-gray-800 text-center">
              📊 Hourly Surf Conditions {date ? `- ${date.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' })}` : ''}
            </h4>
          </div>
        )}
        
        <div className="relative bg-gradient-to-b from-blue-50 to-white rounded-lg p-3" style={{ height }}>
          <svg
            viewBox={`0 0 ${graphWidth} ${graphHeight}`}
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            {/* Gradient definitions */}
            <defs>
              {/* Wave height gradient */}
              <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{stopColor:'#3b82f6', stopOpacity: 0.8}} />
                <stop offset="100%" style={{stopColor:'#1e40af', stopOpacity: 0.3}} />
              </linearGradient>
              
              {/* Period gradient */}
              <linearGradient id="periodGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{stopColor:'#8b5cf6', stopOpacity: 0.7}} />
                <stop offset="100%" style={{stopColor:'#6d28d9', stopOpacity: 0.2}} />
              </linearGradient>
              
              {/* Wind gradient */}
              <linearGradient id="windGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{stopColor:'#10b981', stopOpacity: 0.6}} />
                <stop offset="100%" style={{stopColor:'#047857', stopOpacity: 0.2}} />
              </linearGradient>
              
              {/* Subtle grid pattern */}
              <pattern id="hourlyGrid" width="8.33" height="20" patternUnits="userSpaceOnUse">
                <path d="M 8.33 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5" opacity="0.3"/>
                <path d="M 0 20 L 8.33 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5" opacity="0.2"/>
              </pattern>
              
              {/* Drop shadow filter */}
              <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000" floodOpacity="0.1"/>
              </filter>
            </defs>
            
            {/* Background grid */}
            <rect width="100%" height="100%" fill="url(#hourlyGrid)" />
            
            {/* Wave Height Area Fill */}
            <path
              d={createPath(surfData.waveHeight, maxWave) + ` L ${graphWidth} ${graphHeight} L 0 ${graphHeight} Z`}
              fill="url(#waveGradient)"
              opacity="0.3"
            />
            
            {/* Wave Height Line */}
            <path
              d={createPath(surfData.waveHeight, maxWave)}
              fill="none"
              stroke="#1e40af"
              strokeWidth="3"
              filter="url(#dropShadow)"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Period Area Fill */}
            <path
              d={createPath(surfData.period, maxPeriod) + ` L ${graphWidth} ${graphHeight} L 0 ${graphHeight} Z`}
              fill="url(#periodGradient)"
              opacity="0.2"
            />
            
            {/* Period Line */}
            <path
              d={createPath(surfData.period, maxPeriod)}
              fill="none"
              stroke="#7c3aed"
              strokeWidth="2.5"
              strokeDasharray="6,3"
              filter="url(#dropShadow)"
              strokeLinecap="round"
            />
            
            {/* Wind Speed Line */}
            <path
              d={createPath(surfData.windSpeed, maxWind)}
              fill="none"
              stroke="#059669"
              strokeWidth="2"
              strokeDasharray="3,2"
              filter="url(#dropShadow)"
              strokeLinecap="round"
            />
            
            {/* Enhanced data points */}
            {surfData.waveHeight.map((_, index) => {
              if (index % (variant === 'compact' ? 6 : 3) !== 0) return null;
              
              const x = (index / (surfData.waveHeight.length - 1)) * graphWidth;
              const waveY = graphHeight - ((surfData.waveHeight[index] / maxWave) * graphHeight * 0.8) - (graphHeight * 0.1);
              const periodY = graphHeight - ((surfData.period[index] / maxPeriod) * graphHeight * 0.8) - (graphHeight * 0.1);
              const windY = graphHeight - ((surfData.windSpeed[index] / maxWind) * graphHeight * 0.8) - (graphHeight * 0.1);
              
              return (
                <g key={index}>
                  {/* Wave height point */}
                  <circle cx={x} cy={waveY} r="4" fill="white" stroke="#1e40af" strokeWidth="2" filter="url(#dropShadow)"/>
                  <circle cx={x} cy={waveY} r="2" fill="#3b82f6"/>
                  
                  {variant === 'full' && (
                    <>
                      {/* Period point */}
                      <circle cx={x} cy={periodY} r="3" fill="white" stroke="#7c3aed" strokeWidth="2" filter="url(#dropShadow)"/>
                      <circle cx={x} cy={periodY} r="1.5" fill="#8b5cf6"/>
                      
                      {/* Wind point */}
                      <circle cx={x} cy={windY} r="2.5" fill="white" stroke="#059669" strokeWidth="1.5" filter="url(#dropShadow)"/>
                      <circle cx={x} cy={windY} r="1" fill="#10b981"/>
                    </>
                  )}
                </g>
              );
            })}
            
            {/* Current time indicator */}
            {(() => {
              const currentHour = new Date().getHours();
              if (currentHour < 24) {
                const x = (currentHour / 23) * graphWidth;
                return (
                  <g>
                    <line x1={x} y1="0" x2={x} y2={graphHeight} stroke="#ef4444" strokeWidth="2" strokeDasharray="4,4" opacity="0.7"/>
                    <circle cx={x} cy="5" r="3" fill="#ef4444"/>
                    <text x={x} y="3" textAnchor="middle" className="text-xs fill-white font-semibold">NOW</text>
                  </g>
                );
              }
              return null;
            })()}
          </svg>
        </div>
        
        {/* Enhanced time labels */}
        <div className="flex justify-between mt-3 px-2">
          {[0, 6, 12, 18, 23].map(hour => (
            <div key={hour} className="text-center">
              <div className="text-xs font-medium text-gray-600 bg-white rounded px-2 py-1 shadow-sm border">
                {formatTime(surfData.times[hour])}
              </div>
              {hour === new Date().getHours() && (
                <div className="text-xs text-red-500 font-bold mt-1">NOW</div>
              )}
            </div>
          ))}
        </div>
        
        {/* Enhanced legend with cards */}
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Wave Height Card */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm"></div>
                <span className="text-xs font-semibold text-blue-800">Wave Height</span>
              </div>
              <div className="text-lg font-bold text-blue-600">
                {surfData.waveHeight[new Date().getHours()] ? 
                  `${surfData.waveHeight[new Date().getHours()].toFixed(1)}m` : 
                  `${surfData.waveHeight[12].toFixed(1)}m`}
              </div>
              <div className="text-xs text-blue-600">
                Peak: {Math.max(...surfData.waveHeight).toFixed(1)}m
              </div>
            </div>
            
            {/* Period Card */}
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-3 border border-purple-200 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-1 bg-purple-500 rounded shadow-sm" style={{borderTop: '2px dashed #8b5cf6'}}></div>
                <span className="text-xs font-semibold text-purple-800">Period</span>
              </div>
              <div className="text-lg font-bold text-purple-600">
                {surfData.period[new Date().getHours()] ? 
                  `${surfData.period[new Date().getHours()].toFixed(1)}s` : 
                  `${surfData.period[12].toFixed(1)}s`}
              </div>
              <div className="text-xs text-purple-600">
                Best: {Math.max(...surfData.period).toFixed(1)}s
              </div>
            </div>
            
            {/* Wind Speed Card */}
            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-3 border border-green-200 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-1 bg-green-500 rounded shadow-sm" style={{borderTop: '2px dotted #10b981'}}></div>
                <span className="text-xs font-semibold text-green-800">Wind Speed</span>
              </div>
              <div className="text-lg font-bold text-green-600">
                {surfData.windSpeed[new Date().getHours()] ? 
                  `${surfData.windSpeed[new Date().getHours()].toFixed(1)} km/h` : 
                  `${surfData.windSpeed[12].toFixed(1)} km/h`}
              </div>
              <div className="text-xs text-green-600">
                Max: {Math.max(...surfData.windSpeed).toFixed(1)} km/h
              </div>
            </div>
          </div>
          
          {!data && (
            <div className="text-center bg-orange-50 border border-orange-200 rounded-lg p-2">
              <div className="text-xs text-orange-700 font-medium">
                🔄 Live data loading... showing demo values
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}