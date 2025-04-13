const fs = require('fs').promises;
const fetch = require('node-fetch');

async function downloadGDELTData() {
    try {
        // Get the current time in UTC
        const now = new Date();
        const year = now.getUTCFullYear();
        const month = String(now.getUTCMonth() + 1).padStart(2, '0');
        const day = String(now.getUTCDate()).padStart(2, '0');
        const hour = String(now.getUTCHours()).padStart(2, '0');
        const minute = String(Math.floor(now.getUTCMinutes() / 15) * 15).padStart(2, '0');
        const second = '00';
        
        const timestamp = `${year}${month}${day}${hour}${minute}${second}`;
        const gdeltUrl = `https://data.gdeltproject.org/gdeltv3/gdg/${timestamp}.gdg.v3.json.gz`;
        console.log('Fetching GDELT data from:', gdeltUrl);
        
        // Fetch the gzipped JSON data
        const response = await fetch(gdeltUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        // Get the raw buffer
        const buffer = await response.arrayBuffer();
        
        // Convert to base64 for decompression
        const base64 = Buffer.from(buffer).toString('base64');
        
        // Decompress using pako
        const pako = require('pako');
        const decompressed = pako.inflate(base64, { to: 'string' });
        
        // Parse the JSON
        const data = JSON.parse(decompressed);
        console.log('Successfully fetched and parsed GDELT data');
        
        // Save the data to a file
        await fs.writeFile('gdelt_data.json', JSON.stringify(data, null, 2));
        console.log('Data saved to gdelt_data.json');
        
        return data;
    } catch (error) {
        console.error('Error downloading GDELT data:', error);
        throw error;
    }
}

// Run the download function
downloadGDELTData().catch(console.error);
