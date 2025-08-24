// Test the live forecast with correct URL to check tide data across days

const testLiveForecastCorrectURL = async () => {
    try {
        console.log('🔍 Testing live forecast with correct URL...\n');
        
        const url = 'https://surf-finder.netlify.app/.netlify/functions/get-forecast?lat=50.3465&lng=-5.157';
        console.log(`📞 Calling: ${url}`);
        
        const response = await fetch(url);
        
        console.log(`📊 Response status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log('\n📊 LIVE FORECAST RESPONSE:');
            console.log('Raw response:', JSON.stringify(data, null, 2));
            
            if (data.days && data.days.length > 0) {
                console.log(`\n🗓️ Found ${data.days.length} forecast days`);
                
                data.days.forEach((day, index) => {
                    console.log(`\n📅 Day ${index + 1}: ${day.date} (${day.dayName})`);
                    
                    if (day.tides) {
                        console.log(`   🌊 Tide Source: ${day.tides.source}`);
                        console.log(`   🌊 Current Level: ${day.tides.currentLevel}`);
                        console.log(`   🌊 Is Rising: ${day.tides.isRising}`);
                        console.log(`   🌊 Next High: ${day.tides.nextHigh}`);
                        console.log(`   🌊 Next Low: ${day.tides.nextLow}`);
                        
                        if (day.tides.tideEvents && day.tides.tideEvents.length > 0) {
                            console.log(`   ✅ Tide Events: ${day.tides.tideEvents.length}`);
                            day.tides.tideEvents.slice(0, 3).forEach((event, i) => {
                                const time = new Date(event.time);
                                console.log(`      ${i + 1}. ${event.type.toUpperCase()} at ${time.toLocaleString()} - ${event.height}m`);
                            });
                        } else {
                            console.log(`   ❌ No tide events found!`);
                        }
                    } else {
                        console.log(`   ❌ No tide data found!`);
                    }
                });
            } else {
                console.log('❌ No forecast days found!');
            }
        } else {
            const error = await response.text();
            console.log('❌ API call failed:');
            console.log(`   Error: ${error}`);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
};

testLiveForecastCorrectURL();
