import logging
import re
import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request
from bs4 import BeautifulSoup

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
ATOM_NS = {'atom': 'http://www.w3.org/2005/Atom'}

# In-memory cache for parsed updates
cache = {
    'updates': [],
    'last_updated': None
}

def clean_html_for_tweet(html_str):
    """
    Helper function to clean HTML tags to plain text for tweets.
    """
    if not html_str:
        return ""
    soup = BeautifulSoup(html_str, 'html.parser')
    
    # Replace links with text (href) format if they are useful, but for tweets,
    # we want to keep it short. We can just extract text.
    return soup.get_text().strip()

def fetch_and_parse_feed():
    """
    Fetches the Atom feed from Google Cloud docs and parses it into individual updates.
    """
    logger.info(f"Fetching BigQuery release notes from {FEED_URL}")
    req = urllib.request.Request(
        FEED_URL, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    )
    
    with urllib.request.urlopen(req, timeout=15) as response:
        xml_data = response.read()
        
    root = ET.fromstring(xml_data)
    feed_updated = root.find('atom:updated', ATOM_NS)
    feed_updated_str = feed_updated.text.strip() if feed_updated is not None else ""
    
    parsed_updates = []
    entries = root.findall('atom:entry', ATOM_NS)
    
    for entry in entries:
        date_str = entry.find('atom:title', ATOM_NS).text.strip()
        updated_str = entry.find('atom:updated', ATOM_NS).text.strip()
        link_elem = entry.find('atom:link', ATOM_NS)
        link = link_elem.attrib.get('href', '') if link_elem is not None else ''
        
        content_elem = entry.find('atom:content', ATOM_NS)
        content_html = content_elem.text if content_elem is not None else ''
        
        soup = BeautifulSoup(content_html, 'html.parser')
        h3s = soup.find_all('h3')
        
        if not h3s:
            # Fallback: treat the entire content as one update
            html_desc = str(soup)
            text_desc = clean_html_for_tweet(content_html)
            parsed_updates.append({
                'date': date_str,
                'type': 'Update',
                'html': html_desc,
                'text': text_desc,
                'link': link,
                'id': f"update_{re.sub(r'[^a-zA-Z0-9]', '_', date_str)}_0"
            })
            continue
            
        for idx, h3 in enumerate(h3s):
            update_type = h3.get_text().strip()
            
            # Gather all sibling elements until the next <h3>
            sibling_html = []
            sibling_text = []
            sibling = h3.next_sibling
            
            while sibling and sibling.name != 'h3':
                if sibling.name:
                    sibling_html.append(str(sibling))
                    sibling_text.append(sibling.get_text().strip())
                elif isinstance(sibling, str) and sibling.strip():
                    sibling_html.append(sibling)
                    sibling_text.append(sibling.strip())
                sibling = sibling.next_sibling
            
            html_desc = "".join(sibling_html).strip()
            text_desc = " ".join(sibling_text).strip()
            
            if not text_desc:
                text_desc = update_type
                
            parsed_updates.append({
                'date': date_str,
                'type': update_type,
                'html': html_desc,
                'text': text_desc,
                'link': link,
                'id': f"update_{re.sub(r'[^a-zA-Z0-9]', '_', date_str)}_{idx}"
            })
            
    return parsed_updates, feed_updated_str

@app.route('/')
def home():
    """Renders the single-page application UI."""
    return render_template('index.html')

@app.route('/api/updates')
def get_updates():
    """
    API endpoint that returns the parsed release notes.
    Supports ?refresh=true to force re-fetching.
    """
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    if force_refresh or not cache['updates'] or not cache['last_updated']:
        try:
            updates, feed_updated = fetch_and_parse_feed()
            cache['updates'] = updates
            cache['last_updated'] = feed_updated
            logger.info("Successfully fetched and cached updates.")
        except Exception as e:
            logger.error(f"Error fetching feed: {str(e)}")
            if cache['updates']:
                # Return cached data if available, along with a warning header
                return jsonify({
                    'updates': cache['updates'],
                    'last_updated': cache['last_updated'],
                    'warning': 'Failed to fetch fresh data. Displaying cached version.',
                    'error': str(e)
                }), 200
            else:
                return jsonify({
                    'error': f'Failed to fetch release notes: {str(e)}',
                    'updates': []
                }), 500
                
    return jsonify({
        'updates': cache['updates'],
        'last_updated': cache['last_updated']
    })

if __name__ == '__main__':
    # Start on localhost:5000
    app.run(host='127.0.0.1', port=5000, debug=True)
