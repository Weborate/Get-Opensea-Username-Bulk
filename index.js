require('dotenv').config();
const fs = require('fs');
const csv = require('csv-parser');
const axios = require('axios');

// Read the OpenSea API key from the environment variables
const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY;

// Check if the API key is available
if (!OPENSEA_API_KEY) {
    console.error('Error: OpenSea API key not found in .env file');
    process.exit(1);
}

// Function to get username from OpenSea API
async function getUsername(walletAddress) {
    try {
        const response = await axios.get(`https://api.opensea.io/api/v2/accounts/${walletAddress}`, {
            headers: {
                'X-API-KEY': OPENSEA_API_KEY
            }
        });
        return response.data.username;
    } catch (error) {
        console.error(`Error fetching username for wallet address ${walletAddress}:`, error.response ? error.response.data : error.message);
        return null;
    }
}

// Function to process the CSV file
function processCSV(filePath) {
    const results = [];

    fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            for (const row of results) {
                const walletAddress = row.address;
                if (walletAddress) {
                    const username = await getUsername(walletAddress);
                    console.log(`Address: ${walletAddress}, Username: ${username}`);
                }
            }
        });
}

// Path to the CSV file
const csvFilePath = 'input.csv';

// Start processing the CSV file
processCSV(csvFilePath);