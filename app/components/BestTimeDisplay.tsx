import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';

interface BestTimeData {
  bestTime: {
    hour: number;
    score: number;
    factors: string[];
    time: string;
  };
  bestWindow?: {
    start: number;
    end: number;
    startTime: string;
    endTime: string;
  } | null;
  allHours: Array<{
    hour: number;
    score: number;
    factors: string[];
    time: string;
  }>;
}

interface BestTimeDisplayProps {
  bestTimeData?: BestTimeData | null;
  className?: string;
  variant?: 'full' | 'compact';
}

export default function BestTimeDisplay({ 
  bestTimeData, 
  className = '',
  variant = 'full'
}: BestTimeDisplayProps) {
  
  if (!bestTimeData) {
    return (
      <div className={`bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-4 ${className}`}>
        <div className="text-center">
          <div className="text-amber-600 text-2xl mb-2">🔄</div>
          <div className="text-amber-800 font-semibold">Loading best times...</div>
          <div className="text-amber-600 text-sm">Calculating optimal surf conditions</div>
        </div>
      </div>
    );
  }

  const { bestTime, bestWindow, allHours } = bestTimeData;
  
  // Transform data for the chart
  const chartData = allHours.map(hour => ({
    hour: hour.hour,
    score: parseFloat(hour.score.toFixed(1)),
    time: hour.time,
    isBest: hour.hour === bestTime.hour,
    isGood: hour.score >= 6.0,
    factors: hour.factors
  }));

  const currentHour = new Date().getHours();

  // Custom tooltip for the bar chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 max-w-xs">
          <p className="font-semibold text-gray-800">{`${label}:00`}</p>
          <p className="text-blue-600 font-medium">{`Score: ${data.score}/10`}</p>
          {data.factors && data.factors.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-gray-600 mb-1">Factors:</p>
              {data.factors.map((factor: string, index: number) => (
                <p key={index} className="text-xs text-gray-700">• {factor}</p>
              ))}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom bar shape to highlight best times
  const CustomBar = (props: any) => {
    const { fill, ...rest } = props;
    const data = props.payload;
    
    if (data.isBest) {
      return <Bar {...rest} fill="#059669" />;
    } else if (data.isGood) {
      return <Bar {...rest} fill="#0ea5e9" />;
    } else if (data.score >= 4) {
      return <Bar {...rest} fill="#6b7280" />;
    } else {
      return <Bar {...rest} fill="#dc2626" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 6.5) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 5) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (score >= 3) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 8) return '🔥';
    if (score >= 6.5) return '🌊';
    if (score >= 5) return '👍';
    if (score >= 3) return '⚠️';
    return '💤';
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg border-0 ${className}`}>
      <div className="p-6">
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            ⏰ Best Time to Surf Today
          </h3>
        </div>

        {/* Best Time Highlight */}
        <div className="mb-6">
          <div className={`rounded-xl p-4 border-2 ${getScoreColor(bestTime.score)}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getScoreEmoji(bestTime.score)}</span>
                <div>
                  <div className="font-bold text-lg">{bestTime.time}</div>
                  <div className="text-sm opacity-75">Prime Time</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{bestTime.score}/10</div>
                <div className="text-xs opacity-75">Score</div>
              </div>
            </div>
            <div className="text-sm">
              <strong>Why it's great:</strong> {bestTime.factors.join(', ')}
            </div>
          </div>
        </div>

        {/* Best Window if available */}
        {bestWindow && (
          <div className="mb-6">
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🕐</span>
                <div className="font-semibold text-green-800">
                  Best Session Window: {bestWindow.startTime} - {bestWindow.endTime}
                </div>
              </div>
              <div className="text-sm text-green-700">
                Consecutive hours of good conditions with safe lighting for an extended surf session
              </div>
              {bestWindow.hasGoodLight && (
                <div className="text-xs text-green-600 mt-1">
                  ☀️ Includes optimal lighting conditions (sunrise/sunset considered)
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hourly Score Chart */}
        {variant === 'full' && (
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-3 text-center">
              📊 24-Hour Surf Condition Scores
            </h4>
            <div style={{ height: '200px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                  <XAxis 
                    dataKey="hour"
                    tickFormatter={(value) => `${value}:00`}
                    stroke="#6b7280"
                    fontSize={10}
                    interval={1}
                  />
                  <YAxis 
                    domain={[0, 10]}
                    stroke="#6b7280"
                    fontSize={12}
                  />
                  
                  {/* Current time reference line */}
                  <ReferenceLine x={currentHour} stroke="#ef4444" strokeDasharray="4 4" opacity={0.8} />
                  
                  <Bar 
                    dataKey="score" 
                    shape={<CustomBar />}
                    radius={[2, 2, 0, 0]}
                  />
                  <Tooltip content={<CustomTooltip />} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Enhanced Legend with Safety Info */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-green-50 rounded-lg p-3 border border-green-200 text-center">
              <div className="text-green-600 font-bold text-lg">🔥</div>
              <div className="text-xs font-semibold text-green-800">Firing (8-10)</div>
              <div className="text-xs text-green-600">Epic conditions</div>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 text-center">
              <div className="text-blue-600 font-bold text-lg">🌊</div>
              <div className="text-xs font-semibold text-blue-800">Good (6.5-8)</div>
              <div className="text-xs text-blue-600">Worth the paddle</div>
            </div>
            
            <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200 text-center">
              <div className="text-yellow-600 font-bold text-lg">👍</div>
              <div className="text-xs font-semibold text-yellow-800">Fair (5-6.5)</div>
              <div className="text-xs text-yellow-600">Rideable waves</div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 text-center">
              <div className="text-gray-600 font-bold text-lg">💤</div>
              <div className="text-xs font-semibold text-gray-800">Poor (0-5)</div>
              <div className="text-xs text-gray-600">Skip this session</div>
            </div>
          </div>
          
          {/* Lighting Safety Notice */}
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">☀️</span>
              <div className="font-semibold text-amber-800">Safe Lighting Considered</div>
            </div>
            <div className="text-sm text-amber-700 space-y-1">
              <div>• <strong>Optimal:</strong> Full daylight hours (sunrise to sunset)</div>
              <div>• <strong>Good:</strong> Dawn/dusk with 1-hour buffer each side</div>
              <div>• <strong>Avoid:</strong> Dark hours heavily penalized for safety</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}