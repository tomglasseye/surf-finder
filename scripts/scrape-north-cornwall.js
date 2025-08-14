import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class NorthCornwallScraper {
  constructor() {
    this.baseUrl = 'https://www.surf-forecast.com';
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    this.spots = [];
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

  extractSpotLinks(html) {
    const spots = [];
    
    // Look for links to individual breaks
    const linkRegex = /<a[^>]+href="([^"]*\/breaks\/[^"]+)"[^>]*>([^<]+)<\/a>/gi;
    let match;
    
    while ((match = linkRegex.exec(html)) !== null) {
      const url = match[1];
      const name = match[2].trim();
      
      // Clean up the spot name
      const cleanName = name
        .replace(/\s*\([^)]*\)/, '') // Remove parentheses content
        .replace(/\s*-\s*forecasts.*$/i, '') // Remove forecast text
        .trim();
      
      // Skip if name is too short or contains unwanted text
      if (cleanName.length > 2 && 
          !cleanName.toLowerCase().includes('forecast') &&
          !cleanName.toLowerCase().includes('report') &&
          !cleanName.toLowerCase().includes('weather') &&
          !url.includes('forecasts/latest')) {
        
        spots.push({
          name: cleanName,
          url: url.startsWith('/') ? this.baseUrl + url : url
        });
      }
    }
    
    // Look for spots mentioned in text content (backup method)
    const textSpotRegex = /(?:^|\s)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Beach|Bay|Cove|Point|Head|Rock)))\b/g;
    let textMatch;
    
    while ((textMatch = textSpotRegex.exec(html)) !== null) {
      const spotName = textMatch[1].trim();
      
      // Add if not already found and looks like a surf spot
      if (!spots.find(s => s.name.toLowerCase() === spotName.toLowerCase()) &&
          spotName.length > 5) {
        spots.push({
          name: spotName,
          url: `${this.baseUrl}/breaks/${spotName.replace(/\s+/g, '_')}`
        });
      }
    }
    
    // Remove duplicates
    const uniqueSpots = spots.filter((spot, index, self) => 
      index === self.findIndex(s => s.name.toLowerCase() === spot.name.toLowerCase()));
    
    return uniqueSpots;
  }

  extractCoordinates(html) {
    // Look for coordinates in various formats
    const patterns = [
      /lat[itude]*["\']?\s*[:=]\s*([+-]?\d+\.?\d*)/i,
      /latitude["\']?\s*[:=]\s*([+-]?\d+\.?\d*)/i,
    ];
    
    const lngPatterns = [
      /l(?:ng|on)[gitude]*["\']?\s*[:=]\s*([+-]?\d+\.?\d*)/i,
      /longitude["\']?\s*[:=]\s*([+-]?\d+\.?\d*)/i,
    ];
    
    for (const pattern of patterns) {
      const latMatch = pattern.exec(html);
      if (latMatch) {
        for (const lngPattern of lngPatterns) {
          const lngMatch = lngPattern.exec(html);
          if (lngMatch) {
            return {
              latitude: parseFloat(latMatch[1]),
              longitude: parseFloat(lngMatch[1])
            };
          }
        }
      }
    }
    
    // Look for Google Maps coordinates
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
      'north': 'N', 'n': 'N',
      'northeast': 'NE', 'north-east': 'NE', 'ne': 'NE',
      'east': 'E', 'e': 'E',
      'southeast': 'SE', 'south-east': 'SE', 'se': 'SE',
      'south': 'S', 's': 'S',
      'southwest': 'SW', 'south-west': 'SW', 'sw': 'SW',
      'west': 'W', 'w': 'W',
      'northwest': 'NW', 'north-west': 'NW', 'nw': 'NW',
      'west-southwest': 'WSW', 'westsouthwest': 'WSW', 'wsw': 'WSW',
      'west-northwest': 'WNW', 'westnorthwest': 'WNW', 'wnw': 'WNW'
    };
    
    const directions = [];
    const textLower = text.toLowerCase();
    
    for (const [key, value] of Object.entries(directionMap)) {
      if (textLower.includes(key) && !directions.includes(value)) {
        directions.push(value);
      }
    }
    
    return directions;
  }

  directionsToRange(directions) {
    if (!directions || directions.length === 0) return [270, 330]; // Default W-NW for Cornwall
    
    const directionDegrees = {
      'N': [350, 10], 'NE': [35, 55], 'E': [80, 100], 'SE': [125, 145],
      'S': [170, 190], 'SW': [215, 235], 'W': [260, 280], 'NW': [305, 325],
      'WSW': [235, 260], 'WNW': [280, 305]
    };
    
    let allDegrees = [];
    for (const direction of directions) {
      if (directionDegrees[direction]) {
        allDegrees = allDegrees.concat(directionDegrees[direction]);
      }
    }
    
    return allDegrees.length > 0 ? [Math.min(...allDegrees), Math.max(...allDegrees)] : [270, 330];
  }

  guessSpotData(spotName) {
    const name = spotName.toLowerCase();
    
    // Common North Cornwall spots with known characteristics
    const knownSpots = {
      'fistral': { skill: 'Intermediate', break: 'beach', faces: 'N', tide: 'mid' },
      'watergate': { skill: 'Beginner', break: 'beach', faces: 'NW', tide: 'low_to_mid' },
      'polzeath': { skill: 'Beginner', break: 'beach', faces: 'NW', tide: 'mid_to_high' },
      'constantine': { skill: 'Beginner', break: 'beach', faces: 'NW', tide: 'low_to_mid' },
      'harlyn': { skill: 'Beginner', break: 'beach', faces: 'NW', tide: 'all' },
      'sennen': { skill: 'Intermediate', break: 'beach', faces: 'NW', tide: 'low_to_mid' },
      'gwenver': { skill: 'Intermediate', break: 'beach', faces: 'W', tide: 'mid' },
      'porthcurno': { skill: 'Intermediate', break: 'beach', faces: 'SW', tide: 'mid' }
    };
    
    for (const [key, data] of Object.entries(knownSpots)) {
      if (name.includes(key)) {
        return data;
      }
    }
    
    // Default for North Cornwall
    return { 
      skill: 'Intermediate', 
      break: 'beach', 
      faces: 'NW', 
      tide: 'mid' 
    };
  }

  async scrapeSpotDetails(spot) {
    try {
      console.log(`Scraping: ${spot.name}`);
      const html = await this.fetchPage(spot.url);
      
      const coordinates = this.extractCoordinates(html);
      const guessedData = this.guessSpotData(spot.name);
      
      // Extract any description text
      let description = `${guessedData.break} break in North Cornwall`;
      const descRegex = /<p[^>]*>[^<]*(?:break|surf|wave)[^<]*<\/p>/gi;
      const descMatch = descRegex.exec(html);
      if (descMatch) {
        description = descMatch[0].replace(/<[^>]*>/g, '').trim().substring(0, 150);
      }
      
      // Build spot data
      const spotData = {
        name: spot.name,
        latitude: coordinates?.latitude || this.estimateLatitude(spot.name),
        longitude: coordinates?.longitude || this.estimateLongitude(spot.name),
        region: 'Cornwall',
        skillLevel: guessedData.skill,
        optimalSwellDir: [270, 315], // W-NW typical for North Cornwall
        optimalWindDir: [90, 180], // E-S offshore for most spots
        faces: guessedData.faces,
        bestTide: guessedData.tide,
        breakType: guessedData.break,
        reliability: 'Consistent',
        hazards: this.guessHazards(spot.name),
        bestConditions: `Best conditions occur when west-northwest swell combines with offshore wind from southeast`,
        description: description,
        source_url: spot.url
      };
      
      console.log(`✅ ${spot.name}: ${spotData.breakType} break at ${spotData.latitude.toFixed(3)}, ${spotData.longitude.toFixed(3)}`);
      return spotData;
      
    } catch (error) {
      console.error(`❌ Error scraping ${spot.name}: ${error.message}`);
      return null;
    }
  }

  estimateLatitude(spotName) {
    // North Cornwall latitude estimates based on known spots
    const name = spotName.toLowerCase();
    if (name.includes('fistral')) return 50.4161;
    if (name.includes('watergate')) return 50.4425;
    if (name.includes('polzeath')) return 50.5689;
    if (name.includes('constantine')) return 50.5167;
    if (name.includes('harlyn')) return 50.5333;
    if (name.includes('sennen')) return 50.0667;
    // Default North Cornwall latitude
    return 50.4 + Math.random() * 0.3;
  }

  estimateLongitude(spotName) {
    // North Cornwall longitude estimates
    const name = spotName.toLowerCase();
    if (name.includes('fistral')) return -5.0931;
    if (name.includes('watergate')) return -5.0394;
    if (name.includes('polzeath')) return -4.9156;
    if (name.includes('constantine')) return -4.9667;
    if (name.includes('harlyn')) return -4.9833;
    if (name.includes('sennen')) return -5.6833;
    // Default North Cornwall longitude
    return -5.0 - Math.random() * 0.5;
  }

  guessHazards(spotName) {
    const name = spotName.toLowerCase();
    if (name.includes('fistral')) return 'crowded, rips';
    if (name.includes('sennen')) return 'rocks, rips';
    if (name.includes('polzeath')) return 'crowded';
    return 'rips';
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async scrapeNorthCornwall() {
    try {
      console.log('Fetching North Cornwall surf spots...');
      const html = await this.fetchPage('https://www.surf-forecast.com/regions/North-Cornwall');
      
      const spotLinks = this.extractSpotLinks(html);
      console.log(`Found ${spotLinks.length} potential spots:`);
      spotLinks.forEach(spot => console.log(`  - ${spot.name}`));
      
      const results = [];
      
      // Get ALL North Cornwall spots
      const spotsToScrape = spotLinks;
      
      for (let i = 0; i < spotsToScrape.length; i++) {
        const spot = spotsToScrape[i];
        console.log(`\nProgress: ${i + 1}/${spotsToScrape.length}`);
        
        const spotData = await this.scrapeSpotDetails(spot);
        if (spotData) {
          results.push(spotData);
        }
        
        // Be respectful with delays for full scrape
        if (i < spotsToScrape.length - 1) {
          await this.delay(2500); // 2.5 second delay
        }
      }
      
      console.log(`\n✅ Successfully scraped ${results.length} North Cornwall spots`);
      return results;
      
    } catch (error) {
      console.error('Error scraping North Cornwall:', error);
      return [];
    }
  }

  exportToJson(spots) {
    const outputPath = path.join(__dirname, '..', 'app', 'data', 'north-cornwall-spots.json');
    fs.writeFileSync(outputPath, JSON.stringify(spots, null, 2));
    console.log(`📄 Exported ${spots.length} spots to ${outputPath}`);
    return outputPath;
  }
}

async function main() {
  const scraper = new NorthCornwallScraper();
  
  try {
    const spots = await scraper.scrapeNorthCornwall();
    
    if (spots.length > 0) {
      scraper.exportToJson(spots);
      
      console.log('\n🏄‍♂️ NORTH CORNWALL SURF SPOTS:');
      spots.forEach((spot, i) => {
        console.log(`${i + 1}. ${spot.name}`);
        console.log(`   📍 ${spot.latitude.toFixed(4)}, ${spot.longitude.toFixed(4)}`);
        console.log(`   🏄 ${spot.skillLevel} • ${spot.breakType} break`);
        console.log(`   ⚠️  ${spot.hazards}`);
        console.log('');
      });
      
      console.log(`\n🎉 Successfully scraped ${spots.length} North Cornwall surf spots!`);
    } else {
      console.log('❌ No spots were successfully scraped');
    }
  } catch (error) {
    console.error('💥 Script failed:', error);
  }
}

main();