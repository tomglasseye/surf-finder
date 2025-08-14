import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function mergeSpotData() {
  try {
    // Load existing spots
    const existingSpotsPath = path.join(__dirname, '..', 'app', 'data', 'surfSpots.json');
    const existingSpots = JSON.parse(fs.readFileSync(existingSpotsPath, 'utf8'));
    
    // Load new North Cornwall spots
    const newSpotsPath = path.join(__dirname, '..', 'app', 'data', 'north-cornwall-spots.json');
    const newSpots = JSON.parse(fs.readFileSync(newSpotsPath, 'utf8'));
    
    console.log(`📊 Current database: ${existingSpots.length} spots`);
    console.log(`🆕 New North Cornwall spots: ${newSpots.length} spots`);
    
    // Check for duplicates by name
    const existingNames = new Set(existingSpots.map(spot => spot.name.toLowerCase()));
    const uniqueNewSpots = [];
    const duplicates = [];
    
    for (const newSpot of newSpots) {
      const nameLower = newSpot.name.toLowerCase();
      
      // Check for similar names (handle variations like Fistral vs Fistral-North)
      const baseName = nameLower.replace(/-?(north|south|east|west)$/, '').replace(/\s+(north|south|east|west)$/, '');
      const isDuplicate = Array.from(existingNames).some(existing => {
        const existingBase = existing.replace(/-?(north|south|east|west)$/, '').replace(/\s+(north|south|east|west)$/, '');
        return existingBase === baseName || existing === nameLower;
      });
      
      if (!isDuplicate) {
        uniqueNewSpots.push(newSpot);
      } else {
        duplicates.push(newSpot.name);
      }
    }
    
    console.log(`✅ Unique new spots: ${uniqueNewSpots.length}`);
    if (duplicates.length > 0) {
      console.log(`⚠️  Duplicates skipped: ${duplicates.join(', ')}`);
    }
    
    // Merge the data
    const mergedSpots = [...existingSpots, ...uniqueNewSpots];
    
    // Sort by region then name
    mergedSpots.sort((a, b) => {
      if (a.region === b.region) {
        return a.name.localeCompare(b.name);
      }
      return a.region.localeCompare(b.region);
    });
    
    // Create backup of original
    const backupPath = path.join(__dirname, '..', 'app', 'data', 'surfSpots-backup.json');
    fs.writeFileSync(backupPath, JSON.stringify(existingSpots, null, 2));
    console.log(`💾 Created backup: ${backupPath}`);
    
    // Write merged data
    fs.writeFileSync(existingSpotsPath, JSON.stringify(mergedSpots, null, 2));
    console.log(`📄 Updated main database: ${mergedSpots.length} total spots`);
    
    // Show summary by region
    const regions = {};
    mergedSpots.forEach(spot => {
      regions[spot.region] = (regions[spot.region] || 0) + 1;
    });
    
    console.log('\n🌍 Spots by Region:');
    Object.entries(regions)
      .sort((a, b) => b[1] - a[1])
      .forEach(([region, count]) => {
        console.log(`  ${region}: ${count} spots`);
      });
    
    console.log('\n🆕 New spots added:');
    uniqueNewSpots.forEach((spot, i) => {
      console.log(`${i + 1}. ${spot.name} - ${spot.skillLevel} ${spot.breakType} break`);
    });
    
    console.log(`\n🎉 Successfully merged! Database now has ${mergedSpots.length} surf spots.`);
    
  } catch (error) {
    console.error('💥 Error merging spots:', error);
  }
}

mergeSpotData();