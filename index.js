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

// Delay function
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to process the CSV file and write results to a new CSV file
async function processCSV(filePath, outputFilePath, outputSQLFilePath) {
    const results = [];
    const outputData = [];

    fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            for (const row of results) {
                const walletAddress = row.address;
                if (walletAddress) {
                    let userDetails = await getUserDetails(walletAddress);
                    if (userDetails.statusCode && userDetails.statusCode !== 200) {
                        await delay(1000); // Wait 1 second if the request failed
                        userDetails = await getUserDetails(walletAddress); // Retry the request
                    }
                    console.log(`Address: ${walletAddress}, OpenseaUsername: ${userDetails.username}, ProfileImageURL: ${userDetails.profile_image_url}, Bio: ${userDetails.bio}`);
                    outputData.push({
                        address: walletAddress,
                        username: userDetails.username,
                        profile_image_url: userDetails.profile_image_url,
                        bio: userDetails.bio
                    });
                    await delay(200); // Wait 0.2 seconds between each request
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

            // Generate SQL insert statement, if you need

            // Helper function to escape SQL values
            function escapeSQL(value) {
                if (typeof value === 'string') {
                    return value
                        .replace(/\\/g, '\\\\')
                        .replace(/'/g, "\\'")
                        .replace(/"/g, '\\"');
                }
                return value;
            }

            // Inside the processCSV function, where you generate the SQL string
            let sqlString = "INSERT INTO `table` (`address`, `avatar_url`, `name`, `bio`) VALUES ";
            for (let i = 0; i < outputData.length; i++) {
                if (i != 0) {
                    sqlString += `, `;
                }
                sqlString += `('${escapeSQL(outputData[i].address)}', '${escapeSQL(outputData[i].profile_image_url)}', '${escapeSQL(outputData[i].username)}', '${escapeSQL(outputData[i].bio)}')`;
            }
            fs.writeFileSync(outputSQLFilePath, sqlString);
            console.log(`SQL Insert statements written to ${outputSQLFilePath}`);
        });
}

// Path to the CSV file
const csvFilePath = 'input.csv';
const outputFilePath = 'output.csv';
const outputSQLFilePath = 'output.sql';

// Start processing the CSV file
processCSV(csvFilePath, outputFilePath, outputSQLFilePath);
