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

This script calculates the number of unique proposers and the total number of blocks
proposed within a selected time frame for the Cardano blockchain.
Additionally, it prints a distribution table showing how nodes contribute to block production.
### Running the script
```shell
npm run ada-script
```

### Note
To modify the time range, adjust the following values:
- `currentBlockHash` - hash of the last block
- `TARGET_DATE` - set starting date of the time frame to be processed.

Note: Due to API endpoint constraints, blocks are fetched from the newest to the oldest.

***

## Algorand
This script identifies unique block proposers and counts the number of blocks each proposer has created within a selected time frame. The output includes:
- The total number of unique proposers
- The total number of blocks proposed
- A distribution table showing the percentage of blocks proposed by different groups of nodes
- A "superminority" calculation, which highlights the concentration of block proposal power among a small subset of validators. Note that this "superminority" is not equivalent to the Nakamoto Coefficient but serves as an indicator of power concentration.
### Running the script
```shell
npm run algo-script
```
### Note
To modify the time range, adjust the following values:
- `LOWER_DATE_RANGE` - Start date of the analysis period.
- `UPPER_DATE_RANGE` - End date of the analysis period.

***
