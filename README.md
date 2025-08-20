# Surf Finder 🏄‍♂️

A comprehensive surf forecast application that finds the best surf spots near your location and provides real-time conditions.

## Features

- 📍 **Location-based search** - Uses your GPS location to find nearby surf spots
- 🌊 **Real-time conditions** - Fetches current wave height, wind speed, swell direction, and more
- ⭐ **Intelligent scoring** - Rates each spot based on current conditions
- 🗺️ **Interactive maps** - Direct links to Google Maps for directions
- 📊 **Detailed forecasts** - Links to detailed surf forecasts

## Tech Stack

- **Frontend**: React Router 7 with TypeScript
- **Styling**: Tailwind CSS 4
- **Backend**: Netlify Functions
- **APIs**: Open-Meteo for weather and marine data
- **Deployment**: Netlify

## Development Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **View the app**:
   Open [http://localhost:5173](http://localhost:5173)

## Data Scraping (Optional)

The app includes a Python scraper to gather comprehensive UK surf spot data:

1. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Run the scraper**:
   ```bash
   python app/comprehensive_surf_scraper.py
   ```

3. **Update surf data**:
   The scraper generates `uk_surf_spots_comprehensive.json` which can replace the existing surf spots data.

## Deployment

The app is configured for Netlify deployment:

1. **Build the app**:
   ```bash
   npm run build
   ```

2. **Deploy to Netlify**:
   - Connect your repository to Netlify
   - Set build command: `npm run build`
   - Set publish directory: `build/client`
   - The Netlify function will be deployed automatically

## Project Structure

```
surf-finder/
├── app/
│   ├── data/
│   │   └── surfSpots.json          # Surf spots database
│   ├── routes/
│   │   └── home.tsx                # Main surf finder app
│   ├── comprehensive_surf_scraper.py  # Python scraper
│   └── ...
├── netlify/
│   └── functions/
│       └── find-surf-spots.js      # API for finding surf spots
├── netlify.toml                    # Netlify configuration
└── package.json
```

## API Endpoints

- `POST /.netlify/functions/find-surf-spots`
  - Body: `{ latitude: number, longitude: number, maxDistance?: number }`
  - Returns: Top 5 surf spots near the location with current conditions

## Environment Variables

No environment variables required - the app uses public APIs.

## Browser Support

- Chrome/Edge 88+
- Firefox 85+
- Safari 14+
- Requires geolocation support for location-based features

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this project for your own surf adventures! 🏄‍♀️
