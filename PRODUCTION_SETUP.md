# Production Setup Guide

## Current Implementation Status

### ✅ **Working Features (Ready for Production)**

1. **Sunrise/Sunset Data** - **LIVE AND ACCURATE**
   - Uses real `api.sunrise-sunset.org` API
   - Automatically calculates for any location
   - Mathematical fallback if API fails
   - **Status**: Production ready

2. **Tide Data Integration with Scoring** - **WORKING**
   - Scoring system uses `tideLevel` from conditions
   - Compares against spot's `bestTide` preference
   - Awards scoring points based on tide match
   - **Status**: Production ready

3. **Comprehensive Tide Charts** - **VISUALLY COMPLETE**
   - Smooth curves with 15-minute intervals
   - High/low tide markers with heights
   - Sunrise/sunset markers with night greying
   - Current time marker accurate to minutes
   - **Status**: Production ready (using mock data)

### ⚠️ **Features Requiring API Setup**

4. **Real Admiralty Tide Data** - **FRAMEWORK READY**
   - Netlify function created: `netlify/functions/get-tide-data.ts`
   - Handles station finding and tide data retrieval
   - Error handling and fallback to mock data
   - **Missing**: API key configuration
   - **Status**: Ready for API key setup

## Required Environment Variables

### For Netlify Deployment:

```bash
# UK Admiralty API (Required for live tide data)
ADMIRALTY_API_KEY=your_subscription_key_here
```

## Setup Instructions

### 1. Get Admiralty API Access

1. Visit [UK Admiralty Developer Portal](https://developer.admiralty.co.uk/)
2. Create an account and subscribe to the Tidal API
3. Get your subscription key
4. Add to Netlify environment variables: `ADMIRALTY_API_KEY`

### 2. Deploy to Netlify

1. Connect your repository to Netlify
2. Add the environment variable in Netlify dashboard
3. Deploy - the system will automatically use real tide data

### 3. Verification Steps

After deployment with API key:

1. **Check Console Logs**: Look for:
   - `🌊 Using tide station: [Station Name]` (instead of mock data message)
   - `🌊 Retrieved X tide events for [Station Name]`
   - Sunrise/sunset API success messages

2. **Verify Data Sources**:
   - Tide chart should show `source: "admiralty_uk"` 
   - Sunrise times should match official sunrise calculators
   - Future tide predictions should be accurate

3. **Test Scoring Integration**:
   - Spots with `"bestTide": "low"` should score higher at low tide
   - Spots with `"bestTide": "high"` should score higher at high tide
   - Check that scoring reflects real tide conditions

## Data Flow Verification

### Live Data Sources:
- **Sunrise/Sunset**: ✅ `api.sunrise-sunset.org` (already live)
- **Tide Data**: ⏳ UK Admiralty API (needs API key)
- **Weather Data**: Currently mock (separate API needed)

### Scoring System Integration:
- **Tide Scoring**: ✅ Working with `tideLevel` from conditions
- **Spot Preferences**: ✅ Uses `bestTide` from spot data
- **Score Calculation**: ✅ Awards 0-1 points based on tide match

## Mock vs Real Data Indicators

### Development (Mock Data):
```
🌊 Using enhanced mock tide data for 50.4664, -5.0475
Source: "enhanced_mock_uk"
```

### Production (Real Data):
```
🌊 Using tide station: Newlyn (0001)
🌊 Retrieved 8 tide events for Newlyn
Source: "admiralty_uk"
```

## Cost Considerations

- **Sunrise/Sunset API**: Free unlimited
- **Admiralty API**: Paid subscription (check pricing)
- **Netlify Functions**: 125k requests/month free tier

## Fallback Strategy

If Admiralty API fails or quota exceeded:
1. System automatically falls back to enhanced mock data
2. Mock data uses realistic UK tidal patterns
3. Scoring continues to work with mock tide levels
4. Charts remain functional with simulated data

## Testing Production Setup

1. Deploy with `ADMIRALTY_API_KEY` set
2. Monitor Netlify function logs
3. Verify console shows real station names
4. Compare tide predictions with official sources
5. Test scoring changes based on real tide conditions

The system is production-ready and will automatically switch from mock to real data once the API key is configured.