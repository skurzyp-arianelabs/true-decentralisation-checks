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

