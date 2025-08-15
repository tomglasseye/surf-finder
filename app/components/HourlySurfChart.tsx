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
    <div className={`bg-white rounded-lg border ${className}`}>
      <div className="p-4">
        {variant === 'full' && (
          <div className="mb-4">
            <h4 className="text-lg font-semibold text-gray-800 text-center">
              📊 Hourly Surf Conditions {date ? `- ${date.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' })}` : ''}
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
              <pattern id="hourlyGrid" width="12.5" height="20" patternUnits="userSpaceOnUse">
                <path d="M 12.5 0 L 0 0 0 20" fill="none" stroke="#f3f4f6" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hourlyGrid)" />
            
            {/* Wave Height - Blue */}
            <path
              d={createPath(surfData.waveHeight, maxWave)}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              className="drop-shadow-sm"
            />
            
            {/* Period - Purple */}
            <path
              d={createPath(surfData.period, maxPeriod)}
              fill="none"
              stroke="#8b5cf6"
              strokeWidth="2"
              strokeDasharray="4,2"
              className="drop-shadow-sm"
            />
            
            {/* Wind Speed - Green */}
            <path
              d={createPath(surfData.windSpeed, maxWind)}
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
              strokeDasharray="2,3"
              className="drop-shadow-sm"
            />
            
            {/* Data points */}
            {surfData.waveHeight.map((_, index) => {
              if (index % 3 !== 0 && variant === 'compact') return null; // Show fewer points on compact
              
              const x = (index / (surfData.waveHeight.length - 1)) * graphWidth;
              const waveY = graphHeight - ((surfData.waveHeight[index] / maxWave) * graphHeight * 0.8) - (graphHeight * 0.1);
              
              return (
                <g key={index}>
                  <circle cx={x} cy={waveY} r="2" fill="#3b82f6" stroke="white" strokeWidth="1"/>
                </g>
              );
            })}
          </svg>
        </div>
        
        {/* Time labels */}
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          {[0, 6, 12, 18, 23].map(hour => (
            <div key={hour} className="text-center">
              <div>{formatTime(surfData.times[hour])}</div>
            </div>
          ))}
        </div>
        
        {/* Legend and current values */}
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-4 justify-center text-xs">
            <div className="flex items-center gap-1">
              <div className="w-4 h-0.5 bg-blue-500"></div>
              <span>Wave Height</span>
              <span className="font-semibold text-blue-600">
                {surfData.waveHeight[new Date().getHours()] ? 
                  `${surfData.waveHeight[new Date().getHours()].toFixed(1)}m` : 
                  `${surfData.waveHeight[12].toFixed(1)}m`}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-0.5 bg-purple-500" style={{borderTop: '2px dashed #8b5cf6'}}></div>
              <span>Period</span>
              <span className="font-semibold text-purple-600">
                {surfData.period[new Date().getHours()] ? 
                  `${surfData.period[new Date().getHours()].toFixed(1)}s` : 
                  `${surfData.period[12].toFixed(1)}s`}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-0.5 bg-green-500" style={{borderTop: '2px dotted #10b981'}}></div>
              <span>Wind Speed</span>
              <span className="font-semibold text-green-600">
                {surfData.windSpeed[new Date().getHours()] ? 
                  `${surfData.windSpeed[new Date().getHours()].toFixed(1)} km/h` : 
                  `${surfData.windSpeed[12].toFixed(1)} km/h`}
              </span>
            </div>
          </div>
          
          {!data && (
            <div className="text-center text-xs text-orange-600">
              🔄 Mock hourly data for development
            </div>
          )}
        </div>
      </div>
    </div>
  );
}