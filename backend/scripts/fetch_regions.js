// backend/scripts/fetch_regions.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_BASE = 'https://kenyaareadata.vercel.app/api/areas';
const API_KEY = 'keyPub1569gsvndc123kg9sjhg';

async function fetchAllRegions() {
  const url = `${API_BASE}?apiKey=${API_KEY}`;
  const res = await axios.get(url);
  return res.data;
}

(async () => {
  try {
    console.log('Fetching Kenya regions data...');
    const data = await fetchAllRegions();
    // data is like: { "Mombasa": { "Changamwe": ["Ward1","Ward2"], ... }, ... }

    const outPath = path.join(__dirname, '..', 'data', 'kenya_regions.json');
    fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');
    console.log('Saved regions to', outPath);
  } catch (err) {
    console.error('Error fetching regions:', err);
  }
})();
