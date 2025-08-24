// Check hourly data structure
const https = require('https');

https.get('https://surf-finder.netlify.app/.netlify/functions/get-forecast?spotName=croyde-bay&lat=51.1261&lng=-4.2394', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const forecast = JSON.parse(data);
      console.log('First day hourlyData structure:');
      console.log('Type:', typeof forecast.forecast[0].hourlyData);
      console.log('Is object:', typeof forecast.forecast[0].hourlyData === 'object');
      console.log('Has waveHeight:', !!forecast.forecast[0].hourlyData?.waveHeight);
      console.log('waveHeight is array:', Array.isArray(forecast.forecast[0].hourlyData?.waveHeight));
      console.log('waveHeight length:', forecast.forecast[0].hourlyData?.waveHeight?.length);
      console.log('\nFull hourlyData:', JSON.stringify(forecast.forecast[0].hourlyData, null, 2));
    } catch (e) {
      console.error('Error parsing:', e.message);
    }
  });
}).on('error', (e) => {
  console.error('Request error:', e.message);
});
