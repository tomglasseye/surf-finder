// Test which functions are available

const testFunctions = async () => {
    const functions = [
        'get-forecast',
        'find-surf-spots', 
        'get-tide-data',
        'get-marine-conditions'
    ];
    
    console.log('🔍 Testing which Netlify functions are available...\n');
    
    for (const func of functions) {
        try {
            const url = `https://surf-finder-app.netlify.app/.netlify/functions/${func}`;
            console.log(`Testing: ${func}`);
            
            const response = await fetch(url);
            console.log(`  Status: ${response.status} ${response.statusText}`);
            
            if (response.status === 400) {
                console.log(`  ✅ Function exists (400 = missing params expected)`);
            } else if (response.status === 404) {
                console.log(`  ❌ Function not found`);
            } else {
                console.log(`  ⚠️  Unexpected status`);
            }
            
        } catch (error) {
            console.log(`  ❌ Error: ${error.message}`);
        }
        console.log('');
    }
};

testFunctions();
