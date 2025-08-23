// Test specifically to see tide data for each forecast day
async function testTideDataPerDay() {
    console.log('🧪 Testing tide data for each forecast day...');
    
    try {
        const response = await fetch('https://surf-finder.netlify.app/.netlify/functions/get-forecast?lat=50.2&lng=-5.5');
        
        if (response.ok) {
            const data = await response.json();
            console.log(`✅ Found ${data.forecast?.length || 0} forecast days\n`);
            
            if (data.forecast) {
                data.forecast.forEach((day, index) => {
                    console.log(`📅 Day ${index + 1}: ${day.date} (${day.dayName})`);
                    console.log(`   Tide Source: ${day.tideData?.source}`);
                    console.log(`   Next High: ${day.tideData?.nextHigh}`);
                    console.log(`   Next Low: ${day.tideData?.nextLow}`);
                    console.log(`   Current Level: ${day.tideData?.currentLevel}`);
                    console.log('');
                });
            }
        } else {
            console.log(`❌ Response failed: ${response.status}`);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testTideDataPerDay();
