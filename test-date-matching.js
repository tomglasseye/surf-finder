// Test what tide data we're getting for specific dates
import fetch from 'node-fetch';

async function testSpecificDateTideData() {
    try {
        console.log('🔍 Testing tide data for specific forecast days...');
        
        // Test the live forecast for multiple days
        const response = await fetch('https://surf-finder.netlify.app/.netlify/functions/get-forecast?lat=50.5756&lng=-4.9137&spotName=Polzeath');
        
        if (!response.ok) {
            console.log('❌ Response not OK:', response.status);
            return;
        }
        
        const data = await response.json();
        
        if (data.forecast) {
            console.log('\n📅 FORECAST DAYS AND THEIR TIDE EVENTS:');
            
            data.forecast.forEach((day, index) => {
                console.log(`\n📆 DAY ${index + 1}: ${day.dateStr} (${day.dayName})`);
                console.log(`Date: ${day.date}`);
                
                if (day.tideData && day.tideData.tideEvents && day.tideData.tideEvents.length > 0) {
                    console.log(`🌊 Tide Events (${day.tideData.tideEvents.length}):`);
                    day.tideData.tideEvents.forEach((event, eventIndex) => {
                        const eventDate = new Date(event.time);
                        const eventDateStr = eventDate.toISOString().split('T')[0];
                        const eventTime = eventDate.toLocaleTimeString();
                        console.log(`  ${eventIndex + 1}. ${event.type.toUpperCase()} at ${eventTime} on ${eventDateStr} - ${event.height}m`);
                        
                        // Check if event date matches the day's date
                        const dayDateStr = new Date(day.date).toISOString().split('T')[0];
                        if (eventDateStr !== dayDateStr) {
                            console.log(`    ⚠️  DATE MISMATCH! Event is on ${eventDateStr} but day is ${dayDateStr}`);
                        }
                    });
                } else {
                    console.log('❌ No tide events for this day');
                }
                
                console.log(`Source: ${day.tideData?.source || 'unknown'}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testSpecificDateTideData();
