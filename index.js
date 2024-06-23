require('dotenv').config();
const fs = require('fs');
const csv = require('csv-parser');
const axios = require('axios');
const { stringify } = require('csv-stringify');

// Read the OpenSea API key from the environment variables
const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY;

// Check if the API key is available
if (!OPENSEA_API_KEY) {
    console.error('Error: OpenSea API key not found in .env file');
    process.exit(1);
}

// Function to get user details from OpenSea API
async function getUserDetails(walletAddress) {
    try {
        const response = await axios.get(`https://api.opensea.io/api/v2/accounts/${walletAddress}`, {
            headers: {
                'X-API-KEY': OPENSEA_API_KEY
            }
        });
        const { username, profile_image_url, bio } = response.data;
        return { username, profile_image_url, bio };
    } catch (error) {
        console.error(`Error fetching details for wallet address ${walletAddress}:`, error.response ? error.response.data : error.message);
        return { username: null, profile_image_url: null, bio: null };
    }
}

// Function to process the CSV file and write results to a new CSV file
function processCSV(filePath, outputFilePath) {
    const results = [];
    const outputData = [];

    fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            for (const row of results) {
                const walletAddress = row.address;
                if (walletAddress) {
                    const userDetails = await getUserDetails(walletAddress);
                    console.log(`Address: ${walletAddress}, OpenseaUsername: ${userDetails.username}, ProfileImageURL: ${userDetails.profile_image_url}, Bio: ${userDetails.bio}`);
                    outputData.push({
                        address: walletAddress,
                        username: userDetails.username,
                        profile_image_url: userDetails.profile_image_url,
                        bio: userDetails.bio
                    });
                }
            }

            // Write the results to the output CSV file
            stringify(outputData, { header: true }, (err, output) => {
                if (err) {
                    console.error('Error writing to CSV file:', err);
                } else {
                    fs.writeFileSync(outputFilePath, output);
                    console.log(`Results written to ${outputFilePath}`);
                }
            });
        });
}

// Path to the CSV file
const csvFilePath = 'input.csv';
const outputFilePath = 'output.csv';

// Start processing the CSV file
processCSV(csvFilePath, outputFilePath);
