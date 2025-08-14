import requests
from bs4 import BeautifulSoup
import json
import time
import re
from urllib.parse import urljoin, urlparse
from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class SurfSpot:
    name: str
    latitude: float
    longitude: float
    region: str
    break_type: str = ""  # beach, reef, point
    skill_level: str = ""
    reliability: str = ""
    optimal_swell_dir: List[str] = None
    optimal_wind_dir: List[str] = None
    best_swell_size: str = ""
    best_conditions_summary: str = ""
    description: str = ""
    hazards: str = ""
    tide_info: str = ""
    crowd_factor: str = ""
    source_url: str = ""

class ComprehensiveSurfScraper:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
        })
        self.surf_spots = []
        self.base_url = 'https://www.surf-forecast.com'
        
    def extract_coordinates_from_page(self, soup) -> Tuple[Optional[float], Optional[float]]:
        """Extract latitude and longitude from various sources on the page"""
        # Method 1: Check for JSON-LD structured data
        scripts = soup.find_all('script', type='application/ld+json')
        for script in scripts:
            try:
                data = json.loads(script.string)
                if 'geo' in data:
                    return float(data['geo']['latitude']), float(data['geo']['longitude'])
            except:
                continue
        
        # Method 2: Look for coordinates in meta tags
        lat_meta = soup.find('meta', attrs={'name': re.compile(r'latitude', re.I)})
        lng_meta = soup.find('meta', attrs={'name': re.compile(r'longitude', re.I)})
        
        if lat_meta and lng_meta:
            try:
                return float(lat_meta.get('content')), float(lng_meta.get('content'))
            except:
                pass
        
        # Method 3: Look for coordinates in JavaScript variables
        scripts = soup.find_all('script')
        for script in scripts:
            if script.string:
                # Look for patterns like lat: 50.123, lng: -5.123
                lat_match = re.search(r'lat[itude]*["\']?\s*[:=]\s*([+-]?\d+\.?\d*)', script.string, re.I)
                lng_match = re.search(r'l(?:ng|on)[gitude]*["\']?\s*[:=]\s*([+-]?\d+\.?\d*)', script.string, re.I)
                
                if lat_match and lng_match:
                    try:
                        return float(lat_match.group(1)), float(lng_match.group(1))
                    except:
                        continue
        
        # Method 4: Look for Google Maps links
        links = soup.find_all('a', href=re.compile(r'maps\.google|google\.com/maps'))
        for link in links:
            href = link.get('href', '')
            coord_match = re.search(r'[@=]([+-]?\d+\.?\d+),([+-]?\d+\.?\d+)', href)
            if coord_match:
                try:
                    return float(coord_match.group(1)), float(coord_match.group(2))
                except:
                    continue
        
        return None, None

    def parse_direction_text(self, direction_text: str) -> List[str]:
        """Parse direction text like 'West-southwest', 'Southeast', etc. into compass directions"""
        if not direction_text:
            return []
        
        # Direction mapping
        direction_map = {
            'n': 'N', 'north': 'N',
            'ne': 'NE', 'northeast': 'NE', 'north-east': 'NE',
            'e': 'E', 'east': 'E',
            'se': 'SE', 'southeast': 'SE', 'south-east': 'SE',
            's': 'S', 'south': 'S',
            'sw': 'SW', 'southwest': 'SW', 'south-west': 'SW',
            'w': 'W', 'west': 'W',
            'nw': 'NW', 'northwest': 'NW', 'north-west': 'NW',
            'wsw': 'WSW', 'west-southwest': 'WSW', 'west southwest': 'WSW',
            'wnw': 'WNW', 'west-northwest': 'WNW', 'west northwest': 'WNW',
            'sse': 'SSE', 'south-southeast': 'SSE', 'south southeast': 'SSE',
            'ssw': 'SSW', 'south-southwest': 'SSW', 'south southwest': 'SSW',
            'nne': 'NNE', 'north-northeast': 'NNE', 'north northeast': 'NNE',
            'nnw': 'NNW', 'north-northwest': 'NNW', 'north northwest': 'NNW',
            'ene': 'ENE', 'east-northeast': 'ENE', 'east northeast': 'ENE',
            'ese': 'ESE', 'east-southeast': 'ESE', 'east southeast': 'ESE'
        }
        
        directions = []
        text_lower = direction_text.lower().strip()
        
        # Try to match full direction names first
        for key, value in direction_map.items():
            if key in text_lower:
                if value not in directions:
                    directions.append(value)
        
        return directions if directions else [direction_text.upper()]

    def scrape_spot_details(self, spot_url: str, spot_name: str) -> Optional[SurfSpot]:
        """Scrape detailed information from individual spot page"""
        try:
            logger.info(f"Scraping details for: {spot_name}")
            response = self.session.get(spot_url)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract coordinates
            lat, lng = self.extract_coordinates_from_page(soup)
            
            if not lat or not lng:
                logger.warning(f"Could not find coordinates for {spot_name}")
                return None
            
            # Initialize spot data
            spot = SurfSpot(
                name=spot_name,
                latitude=lat,
                longitude=lng,
                region=self.determine_region(lat, lng),
                source_url=spot_url
            )
            
            # Extract spot guide description (main description paragraph)
            guide_section = soup.find('div', class_=re.compile(r'guide|description')) or soup.find('p', string=re.compile(r'beach break|reef|point'))
            if not guide_section:
                # Look for the first paragraph that mentions surf-related terms
                paragraphs = soup.find_all('p')
                for p in paragraphs:
                    text = p.get_text().lower()
                    if any(term in text for term in ['beach break', 'reef', 'point break', 'swell', 'offshore', 'consistent']):
                        guide_section = p
                        break
            
            if guide_section:
                description = guide_section.get_text(strip=True)
                spot.description = description
                
                # Extract break type from description
                if 'beach break' in description.lower():
                    spot.break_type = 'beach'
                elif 'reef' in description.lower():
                    spot.break_type = 'reef'
                elif 'point' in description.lower():
                    spot.break_type = 'point'
                
                # Extract hazards
                hazard_keywords = ['dangerous', 'rips', 'rocks', 'shallow', 'crowded', 'advanced', 'heavy']
                hazards = [word for word in hazard_keywords if word in description.lower()]
                if hazards:
                    spot.hazards = ', '.join(hazards)
                
                # Determine skill level based on description
                if any(word in description.lower() for word in ['beginner', 'easy', 'forgiving', 'gentle']):
                    spot.skill_level = 'Beginner'
                elif any(word in description.lower() for word in ['advanced', 'expert', 'dangerous', 'heavy', 'powerful']):
                    spot.skill_level = 'Advanced'
                else:
                    spot.skill_level = 'Intermediate'
            
            # Extract specific optimal conditions information
            # Look for "best conditions" or similar text
            best_conditions_text = ""
            
            # Method 1: Look for specific "best conditions" section
            conditions_section = soup.find(string=re.compile(r'best conditions.*occur when', re.I))
            if conditions_section:
                # Find the parent element and get full text
                parent = conditions_section.parent
                if parent:
                    best_conditions_text = parent.get_text(strip=True)
            
            # Method 2: Look in spot info table/section
            spot_info_section = soup.find('h3', string=re.compile(r'spot info', re.I))
            if spot_info_section:
                # Find the next table or div with spot information
                info_container = spot_info_section.find_next(['table', 'div', 'section'])
                if info_container:
                    info_text = info_container.get_text()
                    if 'swell' in info_text.lower() and 'wind' in info_text.lower():
                        best_conditions_text = info_text
            
            # Parse optimal conditions if found
            if best_conditions_text:
                spot.best_conditions_summary = best_conditions_text
                
                # Extract swell direction
                swell_match = re.search(r'swell.*?from.*?([A-Za-z\-\s]+?)(?:swell|wind|combines)', best_conditions_text, re.I)
                if swell_match:
                    swell_dir_text = swell_match.group(1).strip()
                    spot.optimal_swell_dir = self.parse_direction_text(swell_dir_text)
                
                # Extract wind direction  
                wind_match = re.search(r'wind.*?from.*?([A-Za-z\-\s]+?)(?:\.|\s|$)', best_conditions_text, re.I)
                if wind_match:
                    wind_dir_text = wind_match.group(1).strip()
                    spot.optimal_wind_dir = self.parse_direction_text(wind_dir_text)
            
            # Extract reliability and other spot info from tables
            tables = soup.find_all('table')
            for table in tables:
                rows = table.find_all('tr')
                for row in rows:
                    cells = row.find_all(['td', 'th'])
                    if len(cells) >= 2:
                        key = cells[0].get_text(strip=True).lower()
                        value = cells[1].get_text(strip=True)
                        
                        if 'reliability' in key:
                            spot.reliability = value
                        elif 'type' in key:
                            spot.break_type = value
                        elif 'crowd' in key:
                            spot.crowd_factor = value
            
            # Extract tide information
            tide_section = soup.find(string=re.compile(r'tide|stages of the tide', re.I))
            if tide_section:
                tide_parent = tide_section.parent
                if tide_parent:
                    tide_text = tide_parent.get_text(strip=True)
                    if 'tide' in tide_text.lower():
                        spot.tide_info = tide_text
            
            # Fallback: Extract basic info from meta description
            meta_desc = soup.find('meta', attrs={'name': 'description'})
            if meta_desc and not spot.description:
                spot.description = meta_desc.get('content', '')
            
            logger.info(f"Successfully scraped {spot_name}: {spot.break_type} break, {len(spot.optimal_swell_dir or [])} swell dirs, {len(spot.optimal_wind_dir or [])} wind dirs")
            return spot
            
        except Exception as e:
            logger.error(f"Error scraping {spot_name}: {str(e)}")
            return None

    def get_all_uk_surf_spots(self) -> List[str]:
        """Get all UK surf spot URLs from the main breaks page"""
        try:
            logger.info("Fetching all UK surf spot URLs...")
            response = self.session.get(f'{self.base_url}/countries/United-Kingdom/breaks')
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')
            
            spot_urls = []
            
            # Look for links that go to individual break pages
            # These typically have the pattern /breaks/Spot_Name
            links = soup.find_all('a', href=re.compile(r'/breaks/[A-Za-z0-9_\-]+$'))
            
            for link in links:
                href = link.get('href')
                spot_name = link.get_text(strip=True)
                
                # Skip empty or very short names
                if len(spot_name) < 3:
                    continue
                
                # Skip navigation links
                if any(skip in spot_name.lower() for skip in ['forecast', 'report', 'map', 'weather', 'more']):
                    continue
                    
                full_url = urljoin(self.base_url, href)
                spot_urls.append((full_url, spot_name))
            
            # Remove duplicates while preserving order
            seen = set()
            unique_spots = []
            for url, name in spot_urls:
                if url not in seen:
                    seen.add(url)
                    unique_spots.append((url, name))
            
            logger.info(f"Found {len(unique_spots)} unique surf spots")
            return unique_spots
            
        except Exception as e:
            logger.error(f"Error fetching spot URLs: {str(e)}")
            return []

    def determine_region(self, lat: float, lng: float) -> str:
        """Determine region based on coordinates"""
        if lat > 57:  # Northern Scotland
            return 'Scotland (North)'
        elif lat > 55:  # Southern Scotland
            return 'Scotland (South)'
        elif lat > 53 and lng > -3:  # Northern England (East Coast)
            return 'Northern England (East)'
        elif lat > 53:  # Northern England (West Coast) 
            return 'Northern England (West)'
        elif lat > 52 and lng < -3.5:  # Wales
            return 'Wales'
        elif lat > 51.5 and lng < -4:  # North Cornwall/Devon
            return 'Cornwall/Devon'
        elif lat > 51 and lng < -2:  # South Devon/Dorset
            return 'South West England'
        elif lng > -2:  # South/East England
            return 'South East England'
        else:
            return 'Unknown'

    def scrape_all_spots(self, max_spots: int = None, delay: float = 2.0) -> List[SurfSpot]:
        """Scrape all UK surf spots with detailed information"""
        logger.info("Starting comprehensive UK surf spot scraping...")
        
        # Get all spot URLs
        spot_urls = self.get_all_uk_surf_spots()
        
        if max_spots:
            spot_urls = spot_urls[:max_spots]
            logger.info(f"Limiting to first {max_spots} spots for testing")
        
        successful_spots = []
        
        for i, (url, name) in enumerate(spot_urls, 1):
            logger.info(f"Processing {i}/{len(spot_urls)}: {name}")
            
            spot = self.scrape_spot_details(url, name)
            if spot:
                successful_spots.append(spot)
            
            # Be respectful with delays
            if i < len(spot_urls):
                time.sleep(delay)
        
        logger.info(f"Successfully scraped {len(successful_spots)} out of {len(spot_urls)} spots")
        return successful_spots

    def export_spots_to_json(self, spots: List[SurfSpot], filename: str = 'uk_surf_spots_comprehensive.json'):
        """Export spots to JSON format suitable for the app"""
        spots_data = []
        
        for spot in spots:
            # Convert directions to degree ranges for the app
            optimal_swell_degrees = self.directions_to_degrees(spot.optimal_swell_dir)
            optimal_wind_degrees = self.directions_to_degrees(spot.optimal_wind_dir)
            
            spot_data = {
                'name': spot.name,
                'latitude': spot.latitude,
                'longitude': spot.longitude,
                'region': spot.region,
                'break_type': spot.break_type,
                'skill_level': spot.skill_level,
                'reliability': spot.reliability,
                'optimal_swell_dir': optimal_swell_degrees,
                'optimal_wind_dir': optimal_wind_degrees,
                'optimal_swell_dir_text': ', '.join(spot.optimal_swell_dir) if spot.optimal_swell_dir else '',
                'optimal_wind_dir_text': ', '.join(spot.optimal_wind_dir) if spot.optimal_wind_dir else '',
                'best_conditions_summary': spot.best_conditions_summary,
                'description': spot.description,
                'hazards': spot.hazards,
                'tide_info': spot.tide_info,
                'crowd_factor': spot.crowd_factor,
                'source_url': spot.source_url
            }
            spots_data.append(spot_data)
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(spots_data, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Exported {len(spots_data)} spots to {filename}")
        return filename

    def directions_to_degrees(self, directions: List[str]) -> List[int]:
        """Convert compass directions to degree ranges"""
        if not directions:
            return []
        
        direction_degrees = {
            'N': [350, 10], 'NNE': [10, 35], 'NE': [35, 55], 'ENE': [55, 80],
            'E': [80, 100], 'ESE': [100, 125], 'SE': [125, 145], 'SSE': [145, 170],
            'S': [170, 190], 'SSW': [190, 215], 'SW': [215, 235], 'WSW': [235, 260],
            'W': [260, 280], 'WNW': [280, 305], 'NW': [305, 325], 'NNW': [325, 350]
        }
        
        # Find the range that covers all specified directions
        all_degrees = []
        for direction in directions:
            if direction in direction_degrees:
                all_degrees.extend(direction_degrees[direction])
        
        if all_degrees:
            return [min(all_degrees), max(all_degrees)]
        else:
            # Default wide range if we can't parse
            return [180, 360]

def main():
    """Run the comprehensive scraping process"""
    scraper = ComprehensiveSurfScraper()
    
    # For testing, limit to first 10 spots
    # Remove max_spots parameter for full scrape
    spots = scraper.scrape_all_spots(max_spots=10, delay=3.0)  
    
    if spots:
        # Export to JSON
        filename = scraper.export_spots_to_json(spots)
        
        # Print summary
        print(f"\n{'='*60}")
        print(f"SCRAPING COMPLETE - {len(spots)} spots scraped")
        print(f"{'='*60}")
        
        regions = {}
        for spot in spots:
            regions[spot.region] = regions.get(spot.region, 0) + 1
        
        print("\nSpots by Region:")
        for region, count in regions.items():
            print(f"  {region}: {count}")
        
        print(f"\nDetailed breakdown:")
        for i, spot in enumerate(spots[:5], 1):  # Show first 5
            print(f"\n{i}. {spot.name} ({spot.region})")
            print(f"   Type: {spot.break_type}, Level: {spot.skill_level}")
            print(f"   Best swell: {', '.join(spot.optimal_swell_dir or ['Unknown'])}")
            print(f"   Best wind: {', '.join(spot.optimal_wind_dir or ['Unknown'])}")
            print(f"   Coords: {spot.latitude:.4f}, {spot.longitude:.4f}")
        
        print(f"\nFull data exported to: {filename}")
    
    else:
        print("No spots were successfully scraped. Check the logs for errors.")

if __name__ == "__main__":
    main()
