// Quick test to check tide data structure
const https = require('https');

https.get('https://surf-finder.netlify.app/.netlify/functions/get-forecast?spotName=croyde-bay&lat=51.1261&lng=-4.2394', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const forecast = JSON.parse(data);
      console.log('First day tideData structure:');
      console.log(JSON.stringify(forecast.forecast[0].tideData, null, 2));
      console.log('\nTideData type:', typeof forecast.forecast[0].tideData);
      console.log('Has tideEvents?', 'tideEvents' in forecast.forecast[0].tideData);
      if (forecast.forecast[0].tideData.tideEvents) {
        console.log('TideEvents length:', forecast.forecast[0].tideData.tideEvents.length);
        console.log('First tide event:', forecast.forecast[0].tideData.tideEvents[0]);
      }
    } catch (e) {
      console.error('Error parsing:', e.message);
    }
  });
}).on('error', (e) => {
  console.error('Request error:', e.message);
});
