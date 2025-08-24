// Test the tide data function with correct URL

const testTideFunction = async () => {
    try {
        console.log('🌊 Testing tide data function with correct URL...');
        
        const lat = 50.3432;
        const lng = -5.1539;
        const start = new Date().toISOString();
        const end = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        
        const url = `https://surf-finder.netlify.app/.netlify/functions/get-tide-data?lat=${lat}&lng=${lng}&start=${start}&end=${end}`;
        console.log(`📞 Calling: ${url}`);
        
        const response = await fetch(url);
        
        console.log(`📊 Response status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Success! Tide data received:');
            console.log(`   Source: ${data.source}`);
            console.log(`   Tide events: ${data.tideEvents.length}`);
            
            // Show first few events
            data.tideEvents.slice(0, 5).forEach((event, i) => {
                const time = new Date(event.time);
                console.log(`   ${i + 1}. ${event.type.toUpperCase()} at ${time.toLocaleString()} - ${event.height}m`);
            });
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

testTideFunction();
