// Detailed test to diagnose function access issues

const diagnosticTest = async () => {
    try {
        console.log('🔍 Detailed diagnostic test for Netlify functions...\n');
        
        const url = 'https://surf-finder-app.netlify.app/.netlify/functions/hello';
        console.log(`📞 Testing: ${url}`);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Test-Client/1.0'
            }
        });
        
        console.log('\n📊 Response Details:');
        console.log(`   Status: ${response.status} ${response.statusText}`);
        console.log(`   Headers:`, Object.fromEntries(response.headers.entries()));
        
        const responseText = await response.text();
        console.log(`\n📄 Response Body:`);
        console.log(responseText);
        
        // Try to parse as JSON if possible
        try {
            const jsonData = JSON.parse(responseText);
            console.log(`\n🔧 Parsed JSON:`, jsonData);
        } catch (e) {
            console.log(`\n⚠️  Response is not valid JSON`);
        }
        
        console.log(`\n🌐 Response URL: ${response.url}`);
        console.log(`🔄 Redirected: ${response.redirected}`);
        
    } catch (error) {
        console.error('\n❌ Request failed:', error.message);
        console.error('Error details:', error);
    }
};

diagnosticTest();
