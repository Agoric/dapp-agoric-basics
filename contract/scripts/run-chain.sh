#!/bin/bash

# Start the chain in the background
/usr/src/upgrade-test-scripts/start_agd.sh &

# wait for blocks to start being produced
waitForBlock 2

make -C /workspace/contract mint100

# bring back chain process to foreground
wait
