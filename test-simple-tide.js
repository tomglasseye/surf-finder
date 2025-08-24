// Test the simple-tide function

const testSimpleTide = async () => {
    try {
        console.log('🔍 Testing simple-tide function...');
        
        const lat = 50.3432;
        const lng = -5.1539;
        const start = new Date().toISOString();
        
        const url = `https://surf-finder-app.netlify.app/.netlify/functions/simple-tide?lat=${lat}&lng=${lng}&start=${start}`;
        console.log(`📞 Calling: ${url}`);
        
        const response = await fetch(url);
        
        console.log(`📊 Response status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Success! Response:');
            console.log(`   Source: ${data.source}`);
            console.log(`   Tide events: ${data.tideEvents?.length || 0}`);
            if (data.tideEvents) {
                data.tideEvents.forEach((event, i) => {
                    const time = new Date(event.time);
                    console.log(`   ${i + 1}. ${event.type.toUpperCase()} at ${time.toLocaleString()} - ${event.height}m`);
                });
            }
        } else {
            const error = await response.text();
            console.log('❌ Function call failed:');
            console.log(`   Status: ${response.status}`);
            console.log(`   Error: ${error}`);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
};

testSimpleTide();
