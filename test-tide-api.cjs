const https = require('https');

const url = 'https://surf-finder.netlify.app/.netlify/functions/get-tide-data?lat=50.2&lng=-5.2';

console.log('🌊 Testing tide data API...');

https.get(url, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('✅ Tide API Response:');
      console.log('Source:', json.source);
      console.log('Tide Events:', json.tideEvents?.length || 0);
      if (json.tideEvents && json.tideEvents.length > 0) {
        console.log('First event:', json.tideEvents[0]);
      }
    } catch (e) {
      console.error('❌ Parse error:', e.message);
      console.log('Raw response:', data);
    }
  });
}).on('error', (err) => {
  console.error('❌ Request error:', err.message);
});
