# Proof of Stake Blockchains True Decentralization Tests

This repository contains scripts for gathering information about validator activity on selected Proof of Stake blockchains.
***

## Ethereum

This script measures the number of unique validators within a given period.

### Running the script

```shell
npm run eth-script
```

### Note

Using a free RPC API provider plan may result in request limits being reached for larger time ranges. Additionally, this script may run slowly due to the heavy JSON data being fetched.

***

## Solana

This script measures the number of unique active validators and the number of unique block leaders selected within a given period.

### Running the script
```sh
npm run sol-script
```

### Note

To modify the time range, adjust the FIRST_BLOCK and LAST_BLOCK values.

- The free QuickNode plan allows fetching block leaders in batches of up to 5000. However, validators (voters) for each block can only be fetched individually.

- The current implementation suggests using a batch size (MAX_BATCH_SIZE) of 500 for leaders. This means the script will not fetch validators for every block but will check validators every 500 blocks instead.

- This approach provides a reasonable estimate of currently active validators, as 500 blocks in the Solana blockchain are processed approximately every 3 minutes and 20 seconds.

- Increasing this constant may lead to further inaccuracies. Tests have shown that for longer timeframes, the calculated number of block leaders may exceed the calculated total number of validators in that period. While this scenario is impossible in reality, it occurs because one metric is calculated precisely while the other is approximated.

***

## Cardano

This script measures the number of unique proposers and generates a table of validators grouped by the number of blocks they have validated within a given period.

### Running the script
```sh
npm run ada-script
```

### Note

To change the time range, adjust the TARGET_DATE. The script analyzes blocks from the most recent down to the target date.

***

## Algorand
This script measures validator participation using Bitquery's GraphQL API.
### Running the script
```shell
npm run algo-script
```
### Note
To change the time range, update the following constants in `algorand/index.ts`: 
```TS
const LOWER_DATE_RANGE = "2025-03-27T00:00:00.000Z";
const UPPER_DATE_RANGE = "2025-03-28T00:00:00.000Z";
```

You can limit the number of top validators fetched using the LIMIT_TOP_VALIDATORS constant. By default:
```TS
const LIMIT_TOP_VALIDATORS = 10_000;
```
This value is sufficient, as the total number of validators on the Algorand network is currently lower.

***

## Avalanche
This script analyzes blocks within a given range and outputs a table with block distribution and validator share. It supports multi-key API usage to speed up execution due to strict rate limits.

### Running the script
```shell
npm run avax-script
```

### Note
To adjust the block range, modify the following values:
```TS
const LOWER_BLOCK_HEIGHT = "59553292";
const UPPER_BLOCK_HEIGHT = "59599310";
```

To configure mid-execution data saving, update:
```TS
const MID_EXECUTION_SAVING = 3000; // decides each how many blocks the map of validators is saved
```

To improve performance, provide multiple API keys in the .env file using the following convention:
```shell
AVAX_RPC_API_KEY_1=
AVAX_RPC_API_KEY_2=
...
```

Also update the number of API keys used in `src/avalanche/index.ts`:
```TS
const NUMBER_OF_API_KEYS = X;
```

***

## Polygon
This script analyzes blocks within a specified range and outputs a table showing block distribution and validator share. It also saves progress periodically to avoid data loss.
### Running the script
```shell
npm run pol-script
```

### Note
To modify the block range:
```TS
const LOWER_BLOCK_HEIGHT = "59553292";
const UPPER_BLOCK_HEIGHT = "59599310";
```

To configure periodic data saving:
```TS
const MID_EXECUTION_SAVING = 3000; // Saves validator map every 3000 blocks
```