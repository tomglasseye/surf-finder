// Test the get-forecast function with correct URL

const testForecast = async () => {
    try {
        console.log('🌊 Testing get-forecast function...');
        
        const url = 'https://surf-finder.netlify.app/.netlify/functions/get-forecast?lat=50.3432&lng=-5.1539';
        console.log(`📞 Calling: ${url}`);
        
        const response = await fetch(url);
        
        console.log(`📊 Response status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Success! Forecast data received:');
            console.log(`   Days: ${data.days?.length || 0}`);
            
            if (data.days && data.days[0]) {
                const firstDay = data.days[0];
                console.log(`\n🗓️ First Day (${firstDay.date}):`);
                console.log(`   Tide Source: ${firstDay.tides?.source || 'none'}`);
                console.log(`   Tide Events: ${firstDay.tides?.tideEvents?.length || 0}`);
                
                if (firstDay.tides?.tideEvents?.length > 0) {
                    console.log('   First few tide events:');
                    firstDay.tides.tideEvents.slice(0, 3).forEach((event, i) => {
                        const time = new Date(event.time);
                        console.log(`     ${i + 1}. ${event.type.toUpperCase()} at ${time.toLocaleString()} - ${event.height}m`);
                    });
                }
            }
        } else {
            const error = await response.text();
            console.log('❌ API call failed:');
            console.log(`   Status: ${response.status}`);
            console.log(`   Error: ${error}`);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
};

testForecast();
