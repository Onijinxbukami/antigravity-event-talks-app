from flask import Flask, render_template, jsonify
import xml.etree.ElementTree as ET
import requests
import re

app = Flask(__name__)

# Route to serve the main frontend page
@app.route('/')
def index():
    return render_template('index.html')

# API Route to fetch and parse release notes
@app.route('/api/release-notes')
def get_release_notes():
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        xml_data = response.content
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f"Failed to fetch feed from Google Cloud: {str(e)}"
        }), 500
        
    try:
        root = ET.fromstring(xml_data)
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f"Failed to parse XML data: {str(e)}"
        }), 500
        
    namespace = {'atom': 'http://www.w3.org/2005/Atom'}
    entries = []
    
    for entry in root.findall('atom:entry', namespace):
        title_el = entry.find('atom:title', namespace)
        id_el = entry.find('atom:id', namespace)
        updated_el = entry.find('atom:updated', namespace)
        link_el = entry.find('atom:link', namespace)
        content_el = entry.find('atom:content', namespace)
        
        title = title_el.text if title_el is not None else ""
        entry_id = id_el.text if id_el is not None else ""
        updated = updated_el.text if updated_el is not None else ""
        
        link = ""
        if link_el is not None:
            link = link_el.attrib.get('href', '')
            
        content_html = content_el.text if content_el is not None else ""
        
        # Parse content html into individual updates
        pattern = r'<h3>(.*?)</h3>(.*?)(?=<h3>|$)'
        matches = re.findall(pattern, content_html, re.DOTALL)
        
        parsed_updates = []
        if matches:
            for idx, (utype, udesc) in enumerate(matches):
                # Clean up description (strip extra whitespace)
                cleaned_desc = udesc.strip()
                parsed_updates.append({
                    'id': f"{entry_id}_{idx}",
                    'type': utype.strip(),
                    'description': cleaned_desc
                })
        else:
            parsed_updates.append({
                'id': f"{entry_id}_0",
                'type': 'Update',
                'description': content_html.strip()
            })
            
        entries.append({
            'date': title,
            'updated': updated,
            'link': link,
            'updates': parsed_updates
        })
        
    return jsonify({
        'status': 'success',
        'data': entries
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
