// Test script to verify the exact API key format and test direct API calls
export async function handler(event, context) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json',
    };

    try {
        const API_KEY = process.env.ADMIRALTY_API_KEY;
        
        console.log('🔍 API Key Debug Info:');
        console.log('API_KEY exists:', !!API_KEY);
        console.log('API_KEY length:', API_KEY ? API_KEY.length : 0);
        console.log('API_KEY first 8 chars:', API_KEY ? API_KEY.substring(0, 8) + '...' : 'undefined');
        
        if (!API_KEY) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    error: 'ADMIRALTY_API_KEY environment variable not set',
                    debug: {
                        envVars: Object.keys(process.env).filter(key => key.includes('ADMIRALTY'))
                    }
                })
            };
        }
        
        // Test direct API call
        console.log('🌊 Testing direct API call...');
        
        const stationsUrl = `https://admiraltyapi.azure-api.net/uktidalapi/api/V1/Stations?Radius=50&Lat=50.5756&Lon=-4.9137`;
        
        const response = await fetch(stationsUrl, {
            headers: {
                'Ocp-Apim-Subscription-Key': API_KEY
            }
        });
        
        console.log('📊 API Response Status:', response.status);
        console.log('📊 API Response Headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
            const errorText = await response.text();
            console.log('❌ API Error Response:', errorText);
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    error: 'Admiralty API call failed',
                    status: response.status,
                    statusText: response.statusText,
                    errorBody: errorText,
                    debug: {
                        url: stationsUrl,
                        keyLength: API_KEY.length,
                        keyFirst8: API_KEY.substring(0, 8) + '...'
                    }
                })
            };
        }
        
        const data = await response.json();
        console.log('✅ API Success! Stations found:', data.features?.length || 0);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                stationsFound: data.features?.length || 0,
                firstStation: data.features?.[0]?.properties || null,
                debug: {
                    apiKeyWorking: true,
                    keyLength: API_KEY.length
                }
            })
        };
        
    } catch (error) {
        console.error('❌ Test Error:', error);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                error: error.message,
                stack: error.stack
            })
        };
    }
}
