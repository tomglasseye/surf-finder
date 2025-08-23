// Test the get-tide-data function locally

const { handler } = require('./netlify/functions/get-tide-data.cjs');

const testLocal = async () => {
    try {
        console.log('🔧 Testing get-tide-data function locally...');
        
        const mockEvent = {
            queryStringParameters: {
                lat: '50.3432',
                lng: '-5.1539',
                start: new Date().toISOString(),
                end: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            }
        };
        
        const mockContext = {};
        
        const result = await handler(mockEvent, mockContext);
        
        console.log(`Status: ${result.statusCode}`);
        console.log(`Headers:`, result.headers);
        
        const data = JSON.parse(result.body);
        console.log(`Source: ${data.source}`);
        console.log(`Tide events: ${data.tideEvents?.length || 0}`);
        
        if (data.tideEvents && data.tideEvents.length > 0) {
            console.log('First few events:');
            data.tideEvents.slice(0, 3).forEach((event, i) => {
                const time = new Date(event.time);
                console.log(`  ${i + 1}. ${event.type.toUpperCase()} at ${time.toLocaleString()} - ${event.height}m`);
            });
        }
        
    } catch (error) {
        console.error('❌ Local test failed:', error);
    }
};

testLocal();
