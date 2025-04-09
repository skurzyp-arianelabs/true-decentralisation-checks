import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const rpcUrl = `https://thrilling-sleek-spring.matic.quiknode.pro`;
const LOWER_BLOCK_HEIGHT = "69999851"; // Apr-07-2025 08:00:01 AM +UTC -> selected 69999851
const UPPER_BLOCK_HEIGHT = "70040165"; // Apr-08-2025 08:00:01 AM +UTC -> selected 70040165
const RANGE = Number(UPPER_BLOCK_HEIGHT) - Number(LOWER_BLOCK_HEIGHT); // 40314
const REQUEST_INTERVAL = 70;
const MID_EXECUTION_SAVING = 3000; // decides each how many blocks the map of validators is saved

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function toHexBlock(number: number) {
    return '0x' + number.toString(16);
}

async function prepareStats() {
    try {
        const validators = new Map();
        let currentBlock = Number(UPPER_BLOCK_HEIGHT);
        let totalBlocks = 0;
        const apiKey = process.env.POL_RPC_API_KEY;
        if (!apiKey) throw new Error("Missing API key");

        console.log(`Scanning total of ${RANGE} blocks...`);
        console.log(`Estimated time: ${(RANGE * REQUEST_INTERVAL / 1000).toFixed(0)}s`);

        while (Number(currentBlock) >= Number(LOWER_BLOCK_HEIGHT)) {
            const hexBlock = toHexBlock(currentBlock);
            const data = {
                jsonrpc: '2.0',
                method: 'bor_getAuthor',
                params: [hexBlock],
                id: 1
            };

            try {
                const response = await axios.post(`${rpcUrl}/${apiKey}`, data, {
                    headers: { 'Content-Type': 'application/json' },
                });

                const proposer = response.data.result;
                validators.set(proposer, (validators.get(proposer) || 0) + 1);
            } catch (err) {
                console.error(`Error fetching block ${currentBlock}:`, err?.response?.data || err.message);
            }

            totalBlocks++;

            if (totalBlocks % 100 === 0) {
                console.log(`Processed ${totalBlocks} blocks (${((totalBlocks / RANGE) * 100).toFixed(2)}%)`);
            }

            if (totalBlocks % MID_EXECUTION_SAVING === 0) {
                console.log(`Saving progress at block ${currentBlock}`);
                saveValidators(validators, `validators_${currentBlock}-${UPPER_BLOCK_HEIGHT}`);
            }

            currentBlock--;
            await sleep(REQUEST_INTERVAL);
        }

        console.log(`Finished processing ${totalBlocks} blocks.`);
        saveValidators(validators, `validators_${LOWER_BLOCK_HEIGHT}-${UPPER_BLOCK_HEIGHT}_full_range`);
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
        { range: "1-100", min: 1, max: 100, count: 0, blockShare: 0 },
        { range: "101-250", min: 101, max: 250, count: 0, blockShare: 0 },
        { range: "251-500", min: 251, max: 500, count: 0, blockShare: 0 },
        { range: "501-1000", min: 501, max: 1000, count: 0, blockShare: 0 },
        { range: "1001-2500", min: 1001, max: 2500, count: 0, blockShare: 0 },
        { range: "2501+", min: 2051, max: Infinity, count: 0, blockShare: 0 }
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
