const https = require('https');

// Test a couple different endpoints
const testUrls = [
  'https://surf-finder.netlify.app/.netlify/functions/get-tide-data?lat=50.2&lng=-5.2',
  'https://surf-finder.netlify.app/.netlify/functions/get-forecast?lat=50.2&lng=-5.2&spotName=test'
];

console.log('🌊 Testing multiple APIs...');

testUrls.forEach((url, index) => {
  console.log(`\n--- Test ${index + 1}: ${url.split('?')[0].split('/').pop()} ---`);
  
  https.get(url, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        console.log('✅ Response status:', res.statusCode);
        
        if (json.source) {
          console.log('📊 Source:', json.source);
        }
        
        if (json.tideEvents) {
          console.log('🌊 Tide Events:', json.tideEvents.length);
        }
        
        if (json.forecast && json.forecast[0]) {
          console.log('📈 Forecast source:', json.forecast[0].tideData?.source || 'unknown');
        }
        
        if (json.error) {
          console.log('❌ Error:', json.error);
        }
        
      } catch (e) {
        console.error('❌ Parse error:', e.message);
        console.log('Raw response length:', data.length);
      }
    });
  }).on('error', (err) => {
    console.error('❌ Request error:', err.message);
  });
});
