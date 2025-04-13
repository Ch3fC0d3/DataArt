const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const port = 3000;

// Enable CORS for all routes
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Serve static files from the root directory
app.use(express.static('.'));

// Proxy endpoint for GDELT data
app.get('/api/gdelt', async (req, res) => {
    try {
        // Read the local data file
        const data = await fs.readFile(path.join(__dirname, 'data', 'sample-data.json'), 'utf8');
        console.log('Serving real protest data');
        
        // Parse and send the data
        const parsedData = JSON.parse(data);
        res.json(parsedData);
    } catch (error) {
        console.error('Error serving data:', error);
        res.status(500).json({ error: 'Failed to load data', details: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
