import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const rpcUrl = `https://glacier-api.avax.network/v1/networks/mainnet/blockchains/c-chain/blocks`;
const LOWER_BLOCK_HEIGHT = "59553292"; // Apr 1, 2025, 11:00:00 AM GMT+2, block height: 59553292
const UPPER_BLOCK_HEIGHT = "59599310"; // Apr 2, 2025, 11:00:00 AM GMT+2, block height: 59599310
const RANGE = Number(UPPER_BLOCK_HEIGHT) - Number(LOWER_BLOCK_HEIGHT);
const REQUEST_INTERVAL = 750;
const MID_EXECUTION_SAVING = 3000; // decides each how many blocks the map of validators is saved
const NUMBER_OF_API_KEYS = 3; // Free api plan has a very limited request rate. To speed up the data collection, multiple API keys can be used. Follow the naming convention of the env. file

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function prepareStats() {
    try {
        const validators = new Map();
        let currentBlock = UPPER_BLOCK_HEIGHT;
        let totalBlocks = 0;
        const apiKeys = Array.from({ length: NUMBER_OF_API_KEYS }, (_, i) => process.env[`AVAX_RPC_API_KEY_${i + 1}`]);
        let apiKeyIndex = 0; // Track API key usage in a round-robin fashion

        console.log(`Scanning total of ${RANGE} blocks...`);

        while (totalBlocks <= RANGE) {
            let batchRequests = [];
            let batchBlocks = [];

            for (let i = 0; i < NUMBER_OF_API_KEYS; i++) {
                if (totalBlocks >= RANGE || currentBlock === LOWER_BLOCK_HEIGHT) break;

                let apiKey = apiKeys[apiKeyIndex];
                let blockToFetch = currentBlock;

                let config = {
                    method: 'get',
                    maxBodyLength: Infinity,
                    url: `${rpcUrl}/${blockToFetch}`,
                    headers: {
                        'accept': 'application/json',
                        'x-glacier-api-key': apiKey,
                    },
                };

                batchRequests.push(axios.request(config));
                batchBlocks.push(blockToFetch);

                apiKeyIndex = (apiKeyIndex + 1) % NUMBER_OF_API_KEYS; // Rotate API keys
            }

            // Execute all requests in parallel
            let responses = await Promise.allSettled(batchRequests);

            for (let i = 0; i < responses.length; i++) {
                const response = responses[i]; // Get the response object

                if (response.status === 'fulfilled') {
                    let axiosResponse = response.value;
                    let proposer = axiosResponse.data.proposerDetails.proposerNodeId;
                    validators.set(proposer, (validators.get(proposer) || 0) + 1);

                    // Ensure progress tracking remains accurate
                    if (totalBlocks % 100 === 0) {
                        console.log(`Processed ${totalBlocks} blocks - ${(totalBlocks / RANGE * 100).toFixed(2)}%`);
                    }
                    if (totalBlocks % MID_EXECUTION_SAVING === 0) {
                        console.log(`Saving current progress at ${totalBlocks}`);
                        saveValidators(validators, `validators_${Number(UPPER_BLOCK_HEIGHT) - totalBlocks}-${UPPER_BLOCK_HEIGHT}`);
                    }
                    if (currentBlock === LOWER_BLOCK_HEIGHT) break;


                    totalBlocks++;
                    // Move to next block (parent hash of the last processed block)
                    if (i === responses.length - 1) {
                        currentBlock = axiosResponse.data.parentHash;
                    }
                } else {
                    console.error(`Error fetching block ${batchBlocks[i]}:`, response.reason.message);
                }
            }

            console.log(`Total blocks so far: ${totalBlocks}`);
            await sleep(REQUEST_INTERVAL); // Wait once per batch
        }

        console.log(`Finished processing ${totalBlocks} blocks.`);
        saveValidators(validators, `validators_${LOWER_BLOCK_HEIGHT}-${UPPER_BLOCK_HEIGHT}`);
        const distribution = generateDistribution(validators, totalBlocks);

        console.log(`\nResults:`);
        console.log(`Total blocks analyzed: ${totalBlocks}`);
        console.log(`Unique proposers found: ${validators.size}`);
        console.table(distribution);
    } catch (error) {
        console.error('Error fetching block data:', error);
        throw error;
    }
}

function generateDistribution(validatorCount, totalBlocks) {
    const ranges = [
        { range: "1-10", min: 1, max: 10, count: 0, blockShare: 0 },
        { range: "11-50", min: 11, max: 50, count: 0, blockShare: 0 },
        { range: "51-100", min: 51, max: 100, count: 0, blockShare: 0 },
        { range: "101-500", min: 101, max: 500, count: 0, blockShare: 0 },
        { range: "501+", min: 501, max: Infinity, count: 0, blockShare: 0 }
    ];

    for (const [, blockCount] of validatorCount) {
        for (const range of ranges) {
            if (blockCount >= range.min && blockCount <= range.max) {
                range.count++;
                range.blockShare += blockCount;
                break;
            }
        }
    }

    return ranges.map(r => ({
        Range: r.range,
        Validators: r.count,
        'Block Share %': ((r.blockShare / totalBlocks) * 100).toFixed(2) + '%'
    }));
}

function saveValidators(
  validators: Map<string, number>,
  name: string,
) {
  const outputPath = path.join(__dirname, './out');
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  const jsonFilePath = path.join(outputPath, `${name}.json`);
  const csvFilePath = path.join(outputPath, `${name}.csv`);

  const validatorObject = Object.fromEntries(validators);
  fs.writeFileSync(jsonFilePath, JSON.stringify(validatorObject, null, 2));

  const csvContent = [
    'NodeID,BlockCount',
    ...Object.entries(validatorObject).map(
      ([node, count]) => `${node},${count}`,
    ),
  ].join('\n');
  fs.writeFileSync(csvFilePath, csvContent);

  console.log(`Validators data saved to ${jsonFilePath} and ${csvFilePath}`);
}

prepareStats()
    .then(() => console.log('Analysis complete!'))
    .catch(error => console.error('Failed to complete analysis:', error));
