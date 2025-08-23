// Test the simple hello function

const testHello = async () => {
    try {
        console.log('🔍 Testing simple hello function...');
        
        const url = 'https://surf-finder-app.netlify.app/.netlify/functions/hello';
        console.log(`📞 Calling: ${url}`);
        
        const response = await fetch(url);
        
        console.log(`📊 Response status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Success! Response:', data);
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

testHello();
