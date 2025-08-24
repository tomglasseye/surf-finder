// Test the local get-forecast function directly
import { handler } from './functions/get-forecast.js';

async function testLocalForecast() {
    console.log('🧪 Testing local get-forecast function...');
    
    try {
        const event = {
            queryStringParameters: {
                lat: '50.2',
                lng: '-5.5'
            }
        };
        
        const response = await handler(event, {});
        
        console.log(`Status: ${response.statusCode}`);
        
        if (response.statusCode === 200) {
            const data = JSON.parse(response.body);
            console.log(`Found ${data.forecast?.length || 0} forecast days`);
            
            // Check each day's tide data
            if (data.forecast) {
                data.forecast.forEach((day, index) => {
                    console.log(`Day ${index + 1} (${day.date}): Tide source = ${day.tideData?.source}, High = ${day.tideData?.nextHigh}`);
                });
            }
        } else {
            console.log('Response body:', response.body);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    }
}

testLocalForecast();
