# Tide Data API Setup Guide

## Current Issue

The tide data in your surf finder app is inaccurate because:

1. **Admiralty API URL format is incorrect** - it uses lat/lng instead of station IDs
2. **Fallback mathematical calculation** is too simplified for real tidal patterns
3. **No proper tidal harmonic calculations** for accurate predictions

## Solution: WorldTides.info API

### Step 1: Get WorldTides API Key

1. Go to https://www.worldtides.info/developer
2. Sign up for a free account (100 requests/month)
3. Get your API key from the dashboard

### Step 2: Update Environment Variables

In your Netlify dashboard:

1. Go to Site Settings → Environment Variables
2. **Remove**: `ADMIRALTY_API_KEY` (if you have it)
3. **Add**: `WORLDTIDES_API_KEY` = your_worldtides_key

### Step 3: Test the Fix

The updated code will:

- ✅ Use accurate WorldTides.info data when API key is available
- ✅ Get real tide heights and extremes (high/low times)
- ✅ Normalize tide levels properly based on local tidal range
- ✅ Fall back to improved mathematical calculation if API fails

## API Details

### WorldTides.info Features:

- **Global coverage** - works for any lat/lng coordinates
- **Accurate data** - based on official tidal stations and harmonic analysis
- **Real extremes** - provides actual high/low tide times
- **Free tier** - 100 requests/month (enough for personal use)

### API Response Format:

```json
{
	"status": 200,
	"heights": [
		{ "dt": 1692720000, "height": 2.5 },
		{ "dt": 1692723600, "height": 3.1 }
	],
	"extremes": [
		{ "dt": 1692728400, "type": "High", "height": 4.2 },
		{ "dt": 1692750000, "type": "Low", "height": 0.8 }
	]
}
```

## Expected Results After Fix:

- 🎯 **Accurate tide times** matching real-world conditions
- 📊 **Correct tide levels** showing actual height percentages
- 🕐 **Real high/low times** instead of mathematical estimates
- 🔄 **Proper rising/falling indicators**

## Backup Plan (No API Key):

If you don't set up the API key, the app will still work but fall back to the mathematical calculation. However, for accurate surf forecasting, the real tide data is highly recommended.

## Cost Considerations:

- **Free tier**: 100 requests/month
- **Paid plans**: $10/month for 10,000 requests
- **Usage**: Each forecast page load = 1 request
- **Optimization**: Could cache results for 1 hour to reduce API calls

## Alternative APIs (if needed):

1. **StormGlass.io** - Free tier with 50 requests/day
2. **Tides.p.rapidapi.com** - Various pricing tiers
3. **Marine.gov APIs** - Free but US-focused

## Next Steps:

1. Get WorldTides API key
2. Add to Netlify environment variables
3. Deploy to test the fix
4. Compare with real tide charts to verify accuracy
