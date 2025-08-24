// Test different URL patterns for Netlify functions

const testPatterns = async () => {
    const baseUrl = 'https://surf-finder-app.netlify.app';
    const functionName = 'hello';
    
    const patterns = [
        `${baseUrl}/.netlify/functions/${functionName}`,
        `${baseUrl}/api/${functionName}`,
        `${baseUrl}/functions/${functionName}`,
        `${baseUrl}/${functionName}`
    ];
    
    console.log('🔍 Testing different URL patterns for Netlify functions...\n');
    
    for (const url of patterns) {
        try {
            console.log(`Testing: ${url}`);
            const response = await fetch(url);
            console.log(`  Status: ${response.status} ${response.statusText}`);
            
            if (response.ok) {
                const data = await response.json();
                console.log(`  ✅ SUCCESS! Response:`, data);
                return url; // Return the working pattern
            } else if (response.status === 400) {
                console.log(`  ⚠️  Function exists but missing parameters`);
            } else {
                console.log(`  ❌ Not found`);
            }
        } catch (error) {
            console.log(`  💥 Error: ${error.message}`);
        }
        console.log('');
    }
    
    console.log('No working pattern found.');
    return null;
};

testPatterns();
