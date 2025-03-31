import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';

const rpcUrl = `https://api.cardanoscan.io/api/v1/block`;
const TARGET_DATE = new Date('2025-03-25T12:22:21Z').getTime() / 1000; // Convert to Unix timestamp
const REQUEST_INTERVAL = 1000 / 5; // API rate limit handling
async function countUniqueLeadersCardano() {
    try {
        let currentBlockHash = "82b2a72d3d619b10c80d5672af29e74955b1317b81a7cbefb3186fd057a3ae4b"; // '2025-03-26T12:22:21Z'
        const validatorCount = new Map();
        let totalBlocks = 0;
        let shouldContinue = true;

        console.log(`Scanning blocks until ${new Date(TARGET_DATE * 1000).toISOString()}...`);


        while (shouldContinue) {
            await delay(REQUEST_INTERVAL);

            const response = await axios.get(`${rpcUrl}`, {
                headers: { apiKey: process.env.ADA_RPC_API_KEY },
                params: { blockHash: currentBlockHash }
            });

            const block = response.data;
            const timestamp = new Date(block.timestamp).getTime() / 1000;

            if (timestamp < TARGET_DATE) {
                shouldContinue = false;
                console.log(`Reached target date at block with timestamp ${new Date(timestamp * 1000).toISOString()}`);
                break;
            }

            const slotLeader = block.slotLeader;
            validatorCount.set(slotLeader, (validatorCount.get(slotLeader) || 0) + 1);
            totalBlocks++;

            currentBlockHash = block.previousBlockHash;

            // Log progress every 100 blocks
            if (totalBlocks % 100 === 0) {
                console.log(`Processed ${totalBlocks} blocks, found ${validatorCount.size} unique proposers`);
            }
        }

        // Generate distribution ranges
        const distribution = generateDistribution(validatorCount);

        console.log(`\nResults:`);
        console.log(`Total blocks analyzed: ${totalBlocks}`);
        console.log(`Unique proposers found: ${validatorCount.size}`);
        console.log(`Distribution of validators based on blocks validated:`);
        console.table(distribution);

        return { totalBlocks, validatorCount, distribution };
    } catch (error) {
        console.error('Error counting unique proposers:', error.response?.data || error.message);
        throw error;
    }
}

// Function to group validators into block ranges
function generateDistribution(validatorCount) {
    const ranges = [
        { range: "1-10", min: 1, max: 10, count: 0 },
        { range: "11-50", min: 11, max: 50, count: 0 },
        { range: "51-100", min: 51, max: 100, count: 0 },
        { range: "101-500", min: 101, max: 500, count: 0 },
        { range: "501+", min: 501, max: Infinity, count: 0 }
    ];

    for (const [, blockCount] of validatorCount) {
        for (const range of ranges) {
            if (blockCount >= range.min && blockCount <= range.max) {
                range.count++;
                break;
            }
        }
    }

    return ranges.map(r => ({ Range: r.range, Validators: r.count }));
}

async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the function
countUniqueLeadersCardano()
    .then(() => console.log('Analysis complete!'))
    .catch(error => console.error('Failed to complete analysis:', error));
