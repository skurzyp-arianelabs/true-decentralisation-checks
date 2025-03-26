import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';

const RPC_URL = `https://capable-yolo-reel.solana-mainnet.quiknode.pro/${process.env.SOL_RPC_API_KEY}/`;
const MAX_BATCH_SIZE = 500; // max batch size for free plan is set to 5000
const REQUEST_INTERVAL = 1000 / 20; // API rate limit handling
const FIRST_BLOCK = 325_942_310; //Mar 12, 2025 at 00:49:08 UTC
const LAST_BLOCK = 326_160_000;  // Mar 11, 2025 at 00:49:08 UTC

async function getSlotLeaders(startSlot: number, batchSize: number, retries = 3, delayMs = 1000): Promise<string[]> {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await axios.post(RPC_URL, {
                jsonrpc: '2.0',
                id: 1,
                method: 'getSlotLeaders',
                params: [startSlot, batchSize]
            });

            if (!response.data?.result || !Array.isArray(response.data.result)) {
                console.warn(`Invalid response at slot ${startSlot} (Attempt ${attempt}):`, response.data);
                throw new Error("Invalid response format");
            }

            return response.data.result;
        } catch (error) {
            console.error(`Error fetching slot leaders for slot ${startSlot} (Attempt ${attempt}):`, error.response?.data || error.message);

            if (attempt < retries) {
                console.log(`Retrying in ${delayMs}ms...`);
                await delay(delayMs);
                delayMs *= 2; // Exponential backoff
            } else {
                console.error(`Failed after ${retries} attempts.`);
                return [];
            }
        }
    }
}


async function getUniqueValidators(slot: number): Promise<string[]> {
    try {
        const response = await axios.post(RPC_URL, {
            jsonrpc: '2.0',
            id: 1,
            method: 'getVoteAccounts',
            params: [{ commitment: 'finalized', slot, keepUnstakedDelinquents: false }]
        });

        if (!response.data?.result?.current) {
            console.warn(`Invalid response at slot ${slot}:`, response.data);
            return [];
        }
        return response.data.result.current.map((r: any) => r.nodePubkey);
    } catch (error) {
        console.error(`Error fetching slot validators (voters) ${slot}:`, error.response?.data || error.message);
        return [];
    }
}

async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    const uniqueLeaders = new Set<string>();
    const uniqueValidators = new Set<string>();

    for (let slot = FIRST_BLOCK; slot <= LAST_BLOCK; slot += MAX_BATCH_SIZE) {
        const remainingSlots = LAST_BLOCK - slot + 1;
        const batchSize = Math.min(MAX_BATCH_SIZE, remainingSlots); // Adjust batch size for last iteration

        console.log(`Processing slots ${slot} - ${slot + batchSize - 1} (Batch Size: ${batchSize})...`);

        const leaders = await getSlotLeaders(slot, batchSize, 3, 300);
        if (leaders.length === 0) {
            console.warn(`No leaders found for slots ${slot} - ${slot + batchSize - 1}`);
            continue;
        }

        leaders.forEach(leader => uniqueLeaders.add(leader));
        console.log(`Found ${uniqueLeaders.size} unique slot leaders so far`);

        await delay(REQUEST_INTERVAL);

        const batchValidators = await getUniqueValidators(slot);
        batchValidators.forEach(validator => uniqueValidators.add(validator));

        console.log(`Found ${uniqueValidators.size} unique validators so far`);

        await delay(REQUEST_INTERVAL);

    }

    console.log(`Final Count: ${uniqueLeaders.size} unique leaders, ${uniqueValidators.size} unique validators`);
    console.log(`${(uniqueLeaders.size / uniqueValidators.size) * 100}% of active validators between blocks ${FIRST_BLOCK} and ${LAST_BLOCK} became at some point the leader.`);
}

main()
    .then(() => console.log('Analysis complete!'))
    .catch(error => console.error('Failed to complete analysis:', error));
