const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();

const rpcUrl = `https://eth2-beacon-mainnet.nodereal.io/v1/${process.env.ETH_RPC_API_KEY}`;
const TARGET_DATE = new Date('2025-03-24T12:00:00Z').getTime() / 1000; // Convert to Unix timestamp

// Note that the suggested RPC API provider free plan has request limits. Consider it when setting far TARGET_DATE
async function countUniqueProposers() {
    try {
        let currentBlockId = 'head';
        const uniqueProposers = new Set();
        let totalBlocks = 0;
        let shouldContinue = true;

        console.log(`Scanning blocks until ${new Date(TARGET_DATE * 1000).toISOString()}...`);

        while (shouldContinue) {
            // Fetch current block
            const response = await axios.get(`${rpcUrl}/eth/v2/beacon/blocks/${currentBlockId}`);
            const block = response.data.data;

            // Extract timestamp from execution payload
            const timestamp = parseInt(block.message.body.execution_payload.timestamp);

            // Check if we've reached our target date
            if (timestamp < TARGET_DATE) {
                shouldContinue = false;
                console.log(`Reached target date at block with timestamp ${new Date(timestamp * 1000).toISOString()}`);
                break;
            }

            // Extract proposer index
            const proposerIndex = block.message.proposer_index;
            uniqueProposers.add(proposerIndex);
            totalBlocks++;

            // Move to parent block
            currentBlockId = block.message.parent_root;

            // Log progress every 100 blocks
            if (totalBlocks % 100 === 0) {
                console.log(`Processed ${totalBlocks} blocks, found ${uniqueProposers.size} unique proposers`);
            }
        }

        // Calculate percentage
        const percentage = (uniqueProposers.size / totalBlocks) * 100;

        console.log(`\nResults:`);
        console.log(`Total blocks analyzed: ${totalBlocks}`);
        console.log(`Unique proposers found: ${uniqueProposers.size}`);
        console.log(`Unique proposers percentage: ${percentage.toFixed(2)}%`);

        return {
            totalBlocks,
            uniqueProposers: uniqueProposers.size,
            percentage: percentage.toFixed(2)
        };
    } catch (error) {
        console.error('Error counting unique proposers:', error.response?.data || error.message);
        throw error;
    }
}

// Run the function
countUniqueProposers().then(() => {
    console.log('Analysis complete!');
}).catch(error => {
    console.error('Failed to complete analysis:', error);
});
