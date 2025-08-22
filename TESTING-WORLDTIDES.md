# WorldTides API Testing Guide

## 🚀 Testing Your API Key

### Step 1: Deploy to Netlify

Since the environment variables are on Netlify, you need to deploy to test:

```bash
# Commit and push your changes
git add .
git commit -m "Fix tide data with WorldTides API integration"
git push
```

### Step 2: Test the API Endpoint

I've created a test function. After deployment, visit:

```
https://your-site.netlify.app/.netlify/functions/test-worldtides
```

### Step 3: Check Expected Results

#### ✅ **Success Response:**

```json
{
	"status": "success",
	"message": "WorldTides API working correctly",
	"apiResponse": {
		"status": 200,
		"heightsCount": 24,
		"extremesCount": 4,
		"sampleHeights": [
			{ "dt": 1692720000, "height": 2.5 },
			{ "dt": 1692723600, "height": 3.1 },
			{ "dt": 1692727200, "height": 3.8 }
		],
		"sampleExtremes": [
			{ "dt": 1692728400, "type": "High", "height": 4.2 },
			{ "dt": 1692750000, "type": "Low", "height": 0.8 }
		],
		"location": "50.4161, -5.0931",
		"timeRange": "2025-08-22T20:00:00.000Z to 2025-08-23T20:00:00.000Z"
	}
}
```

#### ❌ **Error Responses:**

**Missing API Key:**

```json
{
	"status": "error",
	"message": "WORLDTIDES_API_KEY environment variable not set",
	"fallback": "Using enhanced calculation instead"
}
```

**Invalid API Key:**

```json
{
	"status": "api_error",
	"message": "WorldTides API returned 401",
	"error": "Unauthorized",
	"suggestion": "Check API key validity and request limits"
}
```

**Rate Limit Exceeded:**

```json
{
	"status": "api_error",
	"message": "WorldTides API returned 429",
	"error": "Too Many Requests"
}
```

### Step 4: Check Netlify Function Logs

In Netlify dashboard → Functions → View logs, you should see:

```
🧪 Testing WorldTides API...
API Key available: ✅ YES
Making API request to WorldTides...
Response status: 200
✅ WorldTides API Success!
Response status: 200
Heights count: 24
Extremes count: 4
```

### Step 5: Test Live Forecast Pages

If the API test passes, your tide charts should now show:

- **Accurate tide levels** matching real conditions
- **Correct high/low times** for your location
- **Proper rising/falling indicators**

Visit any forecast page like:
`https://your-site.netlify.app/forecast/fistral-beach?lat=50.4161&lng=-5.0931`

## 🔧 Troubleshooting

### Common Issues:

1. **Environment Variable Not Set**: Check Netlify dashboard → Site Settings → Environment Variables
2. **Invalid API Key**: Verify at https://www.worldtides.info/developer
3. **Rate Limits**: Free tier = 100 requests/month
4. **Location Issues**: API works globally, but some remote locations may have limited data

### Fallback Behavior:

Even if the API fails, the enhanced mathematical calculation should provide much better results than before.

## 📊 Verification

Compare your app's tide data with official sources:

- **BBC Weather Tides**: https://www.bbc.co.uk/weather/coast-and-sea/tide-tables
- **UK Hydrographic Office**: https://www.admiralty.co.uk/ukho/easytide
- **Cornwall Council**: Local tide tables

The data should now be very close to these official sources!
