const https = require('https');

// Test tide data with different dates
const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);

const testDates = [
  { name: 'Today', date: today },
  { name: 'Tomorrow', date: tomorrow }
];

console.log('🌊 Testing tide data with different dates...');

testDates.forEach((test, index) => {
  const startDate = new Date(test.date);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 1);
  
  const url = `https://surf-finder.netlify.app/.netlify/functions/get-tide-data?lat=50.2&lng=-5.2&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
  
  console.log(`\n--- Test ${index + 1}: ${test.name} (${startDate.toDateString()}) ---`);
  
  https.get(url, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        console.log('✅ Response status:', res.statusCode);
        console.log('📊 Source:', json.source);
        console.log('🌊 Tide Events:', json.tideEvents?.length || 0);
        
        if (json.tideEvents && json.tideEvents.length > 0) {
          console.log('First event:', json.tideEvents[0].time, json.tideEvents[0].type);
          console.log('Last event:', json.tideEvents[json.tideEvents.length - 1].time, json.tideEvents[json.tideEvents.length - 1].type);
        } else {
          console.log('❌ No tide events returned');
        }
        
      } catch (e) {
        console.error('❌ Parse error:', e.message);
      }
    });
  }).on('error', (err) => {
    console.error('❌ Request error:', err.message);
  });
});
