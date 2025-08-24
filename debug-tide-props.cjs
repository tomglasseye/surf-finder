// Test what's being passed to TideChart
const https = require('https');

https.get('https://surf-finder.netlify.app/.netlify/functions/get-forecast?spotName=croyde-bay&lat=51.1261&lng=-4.2394', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const forecast = JSON.parse(data);
      console.log('First day tideData structure:');
      console.log('day.tideData:', JSON.stringify(forecast.forecast[0].tideData, null, 2));
      console.log('\nday.tideData?.tideEvents:', JSON.stringify(forecast.forecast[0].tideData?.tideEvents, null, 2));
      console.log('\nIs tideEvents array?', Array.isArray(forecast.forecast[0].tideData?.tideEvents));
      console.log('tideEvents length:', forecast.forecast[0].tideData?.tideEvents?.length);
    } catch (e) {
      console.error('Error parsing:', e.message);
    }
  });
}).on('error', (e) => {
  console.error('Request error:', e.message);
});
