// Test get-tide-data function for different dates
async function testTideDataFunction() {
    console.log('🧪 Testing get-tide-data function for different dates...\n');
    
    const dates = ['2025-08-23', '2025-08-24', '2025-08-25', '2025-08-26', '2025-08-27'];
    
    for (const date of dates) {
        try {
            const response = await fetch(`https://surf-finder.netlify.app/.netlify/functions/get-tide-data?lat=50.2&lng=-5.5&date=${date}`);
            
            if (response.ok) {
                const data = await response.json();
                console.log(`📅 ${date}:`);
                console.log(`   Source: ${data.source}`);
                console.log(`   Next High: ${data.nextHigh}`);
                console.log(`   Next Low: ${data.nextLow}`);
                console.log(`   Current Level: ${data.currentLevel}`);
                console.log('');
            } else {
                console.log(`❌ ${date}: Response failed - ${response.status}`);
            }
            
        } catch (error) {
            console.error(`❌ ${date}: Error -`, error.message);
        }
    }
}

testTideDataFunction();
