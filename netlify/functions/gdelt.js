const fetch = require('node-fetch');
const pako = require('pako');

exports.handler = async function(event, context) {
  try {
    console.log('Fetching GDELT data...');
    
    // Use the same logic from your server.js
    const response = await fetch('https://data.gdeltproject.org/gdeltv3/iatv/gdg/gdg.natgeo.json.gz');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch GDELT data: ${response.status} ${response.statusText}`);
    }
    
    const buffer = await response.arrayBuffer();
    const compressed = new Uint8Array(buffer);
    
    // Decompress the gzipped data
    let decompressed;
    try {
      decompressed = pako.inflate(compressed, { to: 'string' });
    } catch (error) {
      console.error('Error decompressing data:', error);
      throw new Error('Failed to decompress GDELT data');
    }
    
    // Parse the JSON data
    let data;
    try {
      data = JSON.parse(decompressed);
    } catch (error) {
      console.error('Error parsing JSON:', error);
      throw new Error('Failed to parse GDELT data');
    }
    
    // Return the data as JSON
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET'
      },
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error('Error in GDELT function:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: error.message })
    };
  }
};
