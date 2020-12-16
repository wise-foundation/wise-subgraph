#!/usr/bin/env bash

THEGRAPH_ACCESS_TOKEN="$(cat thegraph-access-token.txt)"
npm run prepare:mainnet && ./node_modules/.bin/graph deploy --node https://api.thegraph.com/deploy/ --ipfs https://api.thegraph.com/ipfs/ wise-foundation/wise --access-token $THEGRAPH_ACCESS_TOKEN
