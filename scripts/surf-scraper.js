import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SurfSpotScraper {
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
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
        }
      }, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => resolve(data));
      });
      
      request.on('error', reject);
      request.setTimeout(10000, () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  parseSpotLinks(html) {
    const spotLinks = [];
    // Extract links to individual break pages
    const linkRegex = /<a[^>]+href="(\/breaks\/[^"]+)"[^>]*>([^<]+)<\/a>/gi;
    let match;
    
    while ((match = linkRegex.exec(html)) !== null) {
      const url = match[1];
      const name = match[2].trim();
      
      // Skip navigation and empty links
      if (name.length > 2 && !['forecast', 'report', 'map', 'weather', 'more'].some(skip => 
          name.toLowerCase().includes(skip))) {
        spotLinks.push({
          url: this.baseUrl + url,
          name: name
        });
      }
    }
    
    // Remove duplicates
    const unique = spotLinks.filter((spot, index, self) => 
      index === self.findIndex(s => s.url === spot.url));
    
    return unique;
  }

  extractCoordinates(html) {
    // Method 1: Look for JSON-LD structured data
    const jsonLdRegex = /<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gis;
    let match = jsonLdRegex.exec(html);
    if (match) {
      try {
        const data = JSON.parse(match[1]);
        if (data.geo && data.geo.latitude && data.geo.longitude) {
          return {
            latitude: parseFloat(data.geo.latitude),
            longitude: parseFloat(data.geo.longitude)
          };
        }
      } catch (e) {
        // Continue to next method
      }
    }

    // Method 2: Look for coordinates in JavaScript
    const jsCoordRegex = /lat[itude]*["\']?\s*[:=]\s*([+-]?\d+\.?\d*)/i;
    const jsLngRegex = /l(?:ng|on)[gitude]*["\']?\s*[:=]\s*([+-]?\d+\.?\d*)/i;
    
    const latMatch = jsCoordRegex.exec(html);
    const lngMatch = jsLngRegex.exec(html);
    
    if (latMatch && lngMatch) {
      return {
        latitude: parseFloat(latMatch[1]),
        longitude: parseFloat(lngMatch[1])
      };
    }

    // Method 3: Look for Google Maps links
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
      'n': 'N', 'north': 'N',
      'ne': 'NE', 'northeast': 'NE', 'north-east': 'NE',
      'e': 'E', 'east': 'E',
      'se': 'SE', 'southeast': 'SE', 'south-east': 'SE',
      's': 'S', 'south': 'S',
      'sw': 'SW', 'southwest': 'SW', 'south-west': 'SW',
      'w': 'W', 'west': 'W',
      'nw': 'NW', 'northwest': 'NW', 'north-west': 'NW',
      'wsw': 'WSW', 'west-southwest': 'WSW',
      'wnw': 'WNW', 'west-northwest': 'WNW',
      'sse': 'SSE', 'south-southeast': 'SSE',
      'ssw': 'SSW', 'south-southwest': 'SSW',
      'nne': 'NNE', 'north-northeast': 'NNE',
      'nnw': 'NNW', 'north-northwest': 'NNW',
      'ene': 'ENE', 'east-northeast': 'ENE',
      'ese': 'ESE', 'east-southeast': 'ESE'
    };
    
    const directions = [];
    const textLower = text.toLowerCase().trim();
    
    for (const [key, value] of Object.entries(directionMap)) {
      if (textLower.includes(key) && !directions.includes(value)) {
        directions.push(value);
      }
    }
    
    return directions.length > 0 ? directions : [text.toUpperCase()];
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
    if (lat > 57) return 'Scotland (North)';
    if (lat > 55) return 'Scotland (South)';
    if (lat > 53 && lng > -3) return 'Northern England (East)';
    if (lat > 53) return 'Northern England (West)';
    if (lat > 52 && lng < -3.5) return 'Wales';
    if (lat > 51.5 && lng < -4) return 'Cornwall/Devon';
    if (lat > 51 && lng < -2) return 'South West England';
    if (lng > -2) return 'South East England';
    return 'Unknown';
  }

  async scrapeSpotDetails(spotUrl, spotName) {
    try {
      console.log(`Scraping: ${spotName}`);
      const html = await this.fetchPage(spotUrl);
      
      const coordinates = this.extractCoordinates(html);
      if (!coordinates) {
        console.log(`No coordinates found for ${spotName}`);
        return null;
      }

      // Extract description - look for main content
      let description = '';
      const descRegex = /<p[^>]*>(.*?break.*?)<\/p>/is;
      const descMatch = descRegex.exec(html);
      if (descMatch) {
        description = descMatch[1].replace(/<[^>]*>/g, '').trim();
      }

      // Extract break type
      let breakType = '';
      if (description.toLowerCase().includes('beach break')) breakType = 'beach';
      else if (description.toLowerCase().includes('reef')) breakType = 'reef';
      else if (description.toLowerCase().includes('point')) breakType = 'point';

      // Extract skill level
      let skillLevel = 'Intermediate';
      if (description.toLowerCase().includes('beginner') || description.toLowerCase().includes('easy')) {
        skillLevel = 'Beginner';
      } else if (description.toLowerCase().includes('advanced') || description.toLowerCase().includes('expert')) {
        skillLevel = 'Advanced';
      }

      // Extract best conditions - look for spot info section
      let bestConditions = '';
      let optimalSwell = [];
      let optimalWind = [];
      
      const conditionsRegex = /best conditions.*?occur when(.*?)(?:\.|<)/is;
      const conditionsMatch = conditionsRegex.exec(html);
      if (conditionsMatch) {
        bestConditions = conditionsMatch[1].trim();
        
        // Extract swell direction
        const swellMatch = /swell.*?from.*?([a-z\-\s]+?)(?:swell|wind|combines)/i.exec(bestConditions);
        if (swellMatch) {
          optimalSwell = this.parseDirections(swellMatch[1]);
        }
        
        // Extract wind direction
        const windMatch = /wind.*?from.*?([a-z\-\s]+?)(?:\.|$)/i.exec(bestConditions);
        if (windMatch) {
          optimalWind = this.parseDirections(windMatch[1]);
        }
      }

      const spot = {
        name: spotName,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        region: this.determineRegion(coordinates.latitude, coordinates.longitude),
        skillLevel: skillLevel,
        optimalSwellDir: this.directionsToRange(optimalSwell),
        optimalWindDir: this.directionsToRange(optimalWind),
        breakType: breakType,
        description: description || `${breakType} break in ${this.determineRegion(coordinates.latitude, coordinates.longitude)}`,
        bestConditions: bestConditions,
        source_url: spotUrl
      };

      console.log(`✓ Scraped ${spotName}: ${breakType} break`);
      return spot;
      
    } catch (error) {
      console.error(`Error scraping ${spotName}: ${error.message}`);
      return null;
    }
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async scrapeAllSpots(maxSpots = 10) {
    try {
      console.log('Fetching UK surf spots list...');
      const html = await this.fetchPage(`${this.baseUrl}/countries/United-Kingdom/breaks`);
      const spotLinks = this.parseSpotLinks(html);
      
      console.log(`Found ${spotLinks.length} potential spots`);
      
      const spotsToScrape = maxSpots ? spotLinks.slice(0, maxSpots) : spotLinks;
      const results = [];
      
      for (let i = 0; i < spotsToScrape.length; i++) {
        const spot = spotsToScrape[i];
        console.log(`Processing ${i + 1}/${spotsToScrape.length}: ${spot.name}`);
        
        const spotData = await this.scrapeSpotDetails(spot.url, spot.name);
        if (spotData) {
          results.push(spotData);
        }
        
        // Be respectful with delays
        if (i < spotsToScrape.length - 1) {
          await this.delay(2000);
        }
      }
      
      console.log(`\nSuccessfully scraped ${results.length} spots`);
      return results;
      
    } catch (error) {
      console.error('Error scraping spots:', error);
      return [];
    }
  }

  exportToJson(spots, filename = 'scraped-surf-spots.json') {
    const outputPath = path.join(__dirname, '..', 'app', 'data', filename);
    fs.writeFileSync(outputPath, JSON.stringify(spots, null, 2));
    console.log(`Exported ${spots.length} spots to ${outputPath}`);
    return outputPath;
  }
}

// Run the scraper
async function main() {
  const scraper = new SurfSpotScraper();
  
  // Test with first 5 spots
  const spots = await scraper.scrapeAllSpots(5);
  
  if (spots.length > 0) {
    scraper.exportToJson(spots, 'scraped-surf-spots.json');
    
    console.log('\n=== SCRAPING RESULTS ===');
    spots.forEach((spot, i) => {
      console.log(`${i + 1}. ${spot.name} (${spot.region})`);
      console.log(`   Type: ${spot.breakType}, Level: ${spot.skillLevel}`);
      console.log(`   Coordinates: ${spot.latitude}, ${spot.longitude}`);
      if (spot.bestConditions) {
        console.log(`   Conditions: ${spot.bestConditions.substring(0, 80)}...`);
      }
      console.log('');
    });
  } else {
    console.log('No spots were successfully scraped');
  }
}

// Run the scraper
main().catch(console.error);

export default SurfSpotScraper;