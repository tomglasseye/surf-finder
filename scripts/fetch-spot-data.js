import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Known UK surf spots to fetch detailed data for
const knownSpots = [
  { name: 'Fistral Beach', url: '/breaks/Fistral_North' },
  { name: 'Watergate Bay', url: '/breaks/Watergate_Bay' },
  { name: 'Polzeath', url: '/breaks/Polzeath' },
  { name: 'Croyde Bay', url: '/breaks/Croyde_Bay' },
  { name: 'Woolacombe', url: '/breaks/Woolacombe' },
  { name: 'Bantham', url: '/breaks/Bantham' },
  { name: 'Saunton Sands', url: '/breaks/Saunton_Sands' },
  { name: 'Sennen Cove', url: '/breaks/Sennen_Cove' },
  { name: 'Constantine Bay', url: '/breaks/Constantine_Bay' },
  { name: 'Harlyn Bay', url: '/breaks/Harlyn_Bay' },
  { name: 'Rhossili Bay', url: '/breaks/Rhossili_Bay' },
  { name: 'Llangennith', url: '/breaks/Llangennith' },
  { name: 'Rest Bay', url: '/breaks/Rest_Bay_Porthcawl' },
  { name: 'Freshwater West', url: '/breaks/Freshwater_West' },
  { name: 'Manorbier', url: '/breaks/Manorbier' },
  { name: 'Thurso East', url: '/breaks/Thurso_East' },
  { name: 'Machrihanish', url: '/breaks/Machrihanish' },
  { name: 'Tynemouth', url: '/breaks/Tynemouth_Longsands' },
  { name: 'Saltburn', url: '/breaks/Saltburn' },
  { name: 'Scarborough', url: '/breaks/Scarborough_South_Bay' }
];

class SpotDataFetcher {
  constructor() {
    this.baseUrl = 'https://www.surf-forecast.com';
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }

  async fetchPage(url) {
    return new Promise((resolve, reject) => {
      const request = https.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        }
      }, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => resolve(data));
      });
      
      request.on('error', reject);
      request.setTimeout(15000, () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  extractCoordinates(html) {
    // Method 1: Look for latitude/longitude in JavaScript
    const latRegex = /lat(?:itude)?\s*[=:]\s*([+-]?\d+\.?\d*)/i;
    const lngRegex = /l(?:ng|on)(?:gitude)?\s*[=:]\s*([+-]?\d+\.?\d*)/i;
    
    const latMatch = latRegex.exec(html);
    const lngMatch = lngRegex.exec(html);
    
    if (latMatch && lngMatch) {
      return {
        latitude: parseFloat(latMatch[1]),
        longitude: parseFloat(lngMatch[1])
      };
    }

    // Method 2: Look for Google Maps coordinates
    const mapsRegex = /maps\.google[^"]*[@=]([+-]?\d+\.?\d+),([+-]?\d+\.?\d+)/i;
    const mapsMatch = mapsRegex.exec(html);
    if (mapsMatch) {
      return {
        latitude: parseFloat(mapsMatch[1]),
        longitude: parseFloat(mapsMatch[2])
      };
    }

    return null;
  }

  parseDirections(text) {
    if (!text) return [];
    
    const directionMap = {
      'north': 'N', 'n ': 'N',
      'northeast': 'NE', 'north-east': 'NE', 'ne': 'NE',
      'east': 'E', 'e ': 'E',
      'southeast': 'SE', 'south-east': 'SE', 'se': 'SE', 
      'south': 'S', 's ': 'S',
      'southwest': 'SW', 'south-west': 'SW', 'sw': 'SW',
      'west': 'W', 'w ': 'W',
      'northwest': 'NW', 'north-west': 'NW', 'nw': 'NW',
      'west-southwest': 'WSW', 'westsouthwest': 'WSW', 'wsw': 'WSW',
      'west-northwest': 'WNW', 'westnorthwest': 'WNW', 'wnw': 'WNW',
      'south-southeast': 'SSE', 'southsoutheast': 'SSE', 'sse': 'SSE',
      'south-southwest': 'SSW', 'southsouthwest': 'SSW', 'ssw': 'SSW',
      'north-northeast': 'NNE', 'northnortheast': 'NNE', 'nne': 'NNE',
      'north-northwest': 'NNW', 'northnorthwest': 'NNW', 'nnw': 'NNW',
      'east-northeast': 'ENE', 'eastnortheast': 'ENE', 'ene': 'ENE',
      'east-southeast': 'ESE', 'eastsoutheast': 'ESE', 'ese': 'ESE'
    };
    
    const textLower = text.toLowerCase().replace(/[\-\s]+/g, '');
    const directions = [];
    
    for (const [key, value] of Object.entries(directionMap)) {
      const keyNorm = key.replace(/[\-\s]+/g, '');
      if (textLower.includes(keyNorm) && !directions.includes(value)) {
        directions.push(value);
      }
    }
    
    return directions.length > 0 ? directions : [];
  }

  directionsToRange(directions) {
    if (!directions || directions.length === 0) return [180, 360];
    
    const directionDegrees = {
      'N': [350, 10], 'NNE': [10, 35], 'NE': [35, 55], 'ENE': [55, 80],
      'E': [80, 100], 'ESE': [100, 125], 'SE': [125, 145], 'SSE': [145, 170],
      'S': [170, 190], 'SSW': [190, 215], 'SW': [215, 235], 'WSW': [235, 260],
      'W': [260, 280], 'WNW': [280, 305], 'NW': [305, 325], 'NNW': [325, 350]
    };
    
    let allDegrees = [];
    for (const direction of directions) {
      if (directionDegrees[direction]) {
        allDegrees = allDegrees.concat(directionDegrees[direction]);
      }
    }
    
    return allDegrees.length > 0 ? [Math.min(...allDegrees), Math.max(...allDegrees)] : [180, 360];
  }

  determineRegion(lat, lng) {
    if (lat > 57) return 'Scotland';
    if (lat > 55) return 'Scotland';
    if (lat > 53 && lng > -3) return 'Northern England';
    if (lat > 53) return 'Northern England';
    if (lat > 52 && lng < -3.5) return 'Wales';
    if (lat > 51.5 && lng < -4) return 'Cornwall';
    if (lat > 51 && lng < -2) return 'Devon';
    if (lng > -2) return 'South East England';
    return 'Unknown';
  }

  async fetchSpotData(spot) {
    try {
      console.log(`Fetching: ${spot.name}`);
      const url = `${this.baseUrl}${spot.url}`;
      const html = await this.fetchPage(url);
      
      const coordinates = this.extractCoordinates(html);
      if (!coordinates) {
        console.log(`  ❌ No coordinates found for ${spot.name}`);
        return null;
      }

      // Extract spot info and description
      let description = spot.name;
      let bestConditions = '';
      let skillLevel = 'Intermediate';
      let breakType = 'beach';
      let reliability = 'Consistent';
      let hazards = '';

      // Look for description text
      const descRegex = /<p[^>]*>[^<]*(?:beach|reef|point|break)[^<]*<\/p>/gi;
      const descMatches = html.match(descRegex);
      if (descMatches && descMatches.length > 0) {
        description = descMatches[0].replace(/<[^>]*>/g, '').trim();
      }

      // Extract break type from description
      if (description.toLowerCase().includes('beach break')) breakType = 'beach';
      else if (description.toLowerCase().includes('reef')) breakType = 'reef';
      else if (description.toLowerCase().includes('point')) breakType = 'point';

      // Extract skill level
      if (description.toLowerCase().includes('beginner') || description.toLowerCase().includes('easy')) {
        skillLevel = 'Beginner';
      } else if (description.toLowerCase().includes('advanced') || description.toLowerCase().includes('expert') || description.toLowerCase().includes('heavy')) {
        skillLevel = 'Advanced';
      }

      // Look for best conditions text
      const conditionsRegex = /best.*?conditions.*?when[^.]+\./gi;
      const conditionsMatch = conditionsRegex.exec(html);
      if (conditionsMatch) {
        bestConditions = conditionsMatch[0];
      }

      // Parse swell and wind directions from conditions
      let optimalSwell = [];
      let optimalWind = [];
      
      if (bestConditions) {
        const swellMatch = /swell.*?from.*?([a-z\-\s]+?)(?:wind|swell|combines|with)/i.exec(bestConditions);
        if (swellMatch) {
          optimalSwell = this.parseDirections(swellMatch[1].trim());
        }
        
        const windMatch = /wind.*?from.*?([a-z\-\s]+?)(?:\.|$)/i.exec(bestConditions);
        if (windMatch) {
          optimalWind = this.parseDirections(windMatch[1].trim());
        }
      }

      const spotData = {
        name: spot.name,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        region: this.determineRegion(coordinates.latitude, coordinates.longitude),
        skillLevel: skillLevel,
        optimalSwellDir: this.directionsToRange(optimalSwell),
        optimalWindDir: this.directionsToRange(optimalWind),
        faces: this.determineFacing(coordinates.latitude, coordinates.longitude),
        bestTide: this.guessBestTide(breakType),
        breakType: breakType,
        reliability: reliability,
        hazards: this.determineHazards(description),
        description: description.substring(0, 200) + (description.length > 200 ? '...' : ''),
        bestConditions: bestConditions,
        source_url: url
      };

      console.log(`  ✅ ${spot.name}: ${breakType} break at ${coordinates.latitude.toFixed(3)}, ${coordinates.longitude.toFixed(3)}`);
      return spotData;
      
    } catch (error) {
      console.error(`  ❌ Error fetching ${spot.name}: ${error.message}`);
      return null;
    }
  }

  determineFacing(lat, lng) {
    // Simple logic based on UK coastline
    if (lng > -1) return 'E'; // East coast
    if (lat > 55) return 'N'; // Scotland - mostly north facing
    if (lng < -4) return 'W'; // West coast
    return 'SW'; // Southwest facing (most common)
  }

  guessBestTide(breakType) {
    return breakType === 'reef' ? 'mid_to_high' : 'mid';
  }

  determineHazards(description) {
    const hazards = [];
    const text = description.toLowerCase();
    if (text.includes('rip') || text.includes('current')) hazards.push('rips');
    if (text.includes('rock') || text.includes('reef')) hazards.push('rocks');
    if (text.includes('crowd') || text.includes('busy')) hazards.push('crowded');
    if (text.includes('shallow')) hazards.push('shallow');
    if (text.includes('power') || text.includes('heavy')) hazards.push('powerful');
    return hazards.join(', ');
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async fetchAllSpots() {
    console.log(`Fetching data for ${knownSpots.length} UK surf spots...`);
    const results = [];
    
    for (let i = 0; i < knownSpots.length; i++) {
      const spot = knownSpots[i];
      console.log(`\nProgress: ${i + 1}/${knownSpots.length}`);
      
      const spotData = await this.fetchSpotData(spot);
      if (spotData) {
        results.push(spotData);
      }
      
      // Be respectful with delays
      if (i < knownSpots.length - 1) {
        await this.delay(3000); // 3 second delay
      }
    }
    
    console.log(`\n✅ Successfully fetched ${results.length} spots`);
    return results;
  }

  exportToJson(spots) {
    const outputPath = path.join(__dirname, '..', 'app', 'data', 'surfSpots.json');
    fs.writeFileSync(outputPath, JSON.stringify(spots, null, 2));
    console.log(`📄 Exported ${spots.length} spots to ${outputPath}`);
    return outputPath;
  }
}

// Run the fetcher
async function main() {
  const fetcher = new SpotDataFetcher();
  
  try {
    // Fetch first 5 spots for testing
    const testSpots = knownSpots.slice(0, 5);
    const originalKnownSpots = [...knownSpots];
    knownSpots.length = 0;
    knownSpots.push(...testSpots);
    
    const spots = await fetcher.fetchAllSpots();
    
    if (spots.length > 0) {
      fetcher.exportToJson(spots);
      
      console.log('\n🏄‍♂️ SURF SPOTS FETCHED:');
      spots.forEach((spot, i) => {
        console.log(`${i + 1}. ${spot.name} (${spot.region})`);
        console.log(`   📍 ${spot.latitude.toFixed(4)}, ${spot.longitude.toFixed(4)}`);
        console.log(`   🏄 ${spot.skillLevel} • ${spot.breakType} break`);
        console.log(`   ⚠️  ${spot.hazards || 'none noted'}`);
        console.log('');
      });
      
      console.log(`\n🎉 Successfully updated surf spots data!`);
      console.log(`Run "npm run dev" to test the app with fresh data.`);
    } else {
      console.log('❌ No spots were successfully fetched');
    }
  } catch (error) {
    console.error('💥 Script failed:', error);
  }
}

main();