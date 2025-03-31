import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';

const rpcUrl = `https://graphql.bitquery.io`; // GraphQL API
const LOWER_DATE_RANGE = "2025-03-27T00:00:00.000Z";
const UPPER_DATE_RANGE = "2025-03-28T00:00:00.000Z";
const LIMIT_TOP_VALIDATORS = 10_000; // 10_000 for fetching all validators

async function prepareStats() {
    try {
        const validators = new Map();
        let totalBlocks = 0;

        let data = JSON.stringify({
            "query": "query ($limit: Int!, $offset: Int!, $from: ISO8601DateTime, $till: ISO8601DateTime) {\n  algorand {\n    blocks(\n      options: {desc: \"count\", asc: \"address.address\", limit: $limit, offset: $offset}\n      date: {since: $from, till: $till}\n    ) {\n      address: proposer {\n        address\n        annotation\n      }\n      count\n      min_date: minimum(of: date)\n      max_date: maximum(of: date)\n    }\n  }\n}\n",
            "variables": `{
  \"limit\": ${LIMIT_TOP_VALIDATORS},
  \"offset\": 0,
  \"network\": \"algorand\",
  \"from\": \"${LOWER_DATE_RANGE}\",
  \"till\": \"${UPPER_DATE_RANGE}\",
  \"dateFormat\": \"%Y-%m-%d\"
}`
        });

        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: rpcUrl,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ory_at_-WI5Y2DtuITm0xmBXdwygczJJXIlZM4CqKualP8jlvU.RcEnl8q2qn54TYVM-NitCz_8E9gnmbJ8ZZ8cBBx4Qr8',
                'X-API-KEY': process.env.ALGO_RPC_API_KEY,
            },
            data : data
        };

        const response = await axios.request(config);
        const validatorsList = response.data.data.algorand.blocks;
        const uniqueProposers = validatorsList.length;

        validatorsList.forEach(validator => {
            validators.set(validator.address.address, validator.count);
            totalBlocks += validator.count;
        });

        const distribution = generateDistribution(validators, totalBlocks);
        const superminority = findSuperminority(validatorsList, totalBlocks);

        console.log(`\nResults:`);
        console.log(`Total blocks analyzed: ${totalBlocks}`);
        console.log(`Unique proposers found: ${uniqueProposers}`);
        console.log(`Distribution of validators based on blocks validated:`);
        console.table(distribution);
        console.log('\"Superminority\" reached by: ' + superminority);

    } catch (error) {
        console.error(error);
        throw error;
    }
}

// Function to group validators into block ranges
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

function findSuperminority(validatorsList, totalBlocks: number) {
    let cumulativeShare = 0;
    let superminority = 0;
    for (const validator of validatorsList) {
        cumulativeShare += validator.count / totalBlocks * 100;
        superminority++;
        if (cumulativeShare >= 33) {
            return superminority;
        }
    }
}

prepareStats()
    .then(() => console.log('Analysis complete!'))
    .catch(error => console.error('Failed to complete analysis:', error));
