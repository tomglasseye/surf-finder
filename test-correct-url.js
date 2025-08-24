// Test the correct Netlify site URL

const testCorrectURL = async () => {
    try {
        console.log('🔍 Testing correct Netlify site URL...\n');
        
        const url = 'https://surf-finder.netlify.app/.netlify/functions/hello';
        console.log(`📞 Testing: ${url}`);
        
        const response = await fetch(url);
        
        console.log(`📊 Response status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ SUCCESS! Function is working!');
            console.log('Response:', data);
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

testCorrectURL();
