// Test the direct tide API call that TideChart uses

const testTideAPI = async () => {
    try {
        console.log('🌊 Testing direct tide API call...');
        
        // Test with Perranporth coordinates
        const lat = 50.3432;
        const lng = -5.1539;
        const start = new Date().toISOString();
        const end = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        
        // In production, this would be your actual domain
        const baseUrl = 'https://surf-finder-app.netlify.app';
        const url = `${baseUrl}/.netlify/functions/get-tide-data?lat=${lat}&lng=${lng}&start=${start}&end=${end}`;
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

testTideAPI();
