#!/bin/bash
$USER="node"

if [ -x "$(command -v docker)" ]; then
  docker --version
else
  echo "Docker is not installed. Installing..."
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh
  sudo usermod -aG docker $USER
fi

docker pull ghcr.io/subrelay/chain-worker/develop:latest
docker run --name=chain-worker_polkadot -d  --env-file .env -e QUEUE_NAME="block" -e CHAIN_RPC="wss://rpc.polkadot.io" ghcr.io/subrelay/chain-worker/develop:latest
docker run --name=chain-worker_westend -d  --env-file .env -e QUEUE_NAME="block" -e CHAIN_RPC="wss://westend-rpc.polkadot.io" ghcr.io/subrelay/chain-worker/develop:latest
docker run --name=chain-worker_kusama -d  --env-file .env -e QUEUE_NAME="block" -e CHAIN_RPC="wss://kusama-rpc.polkadot.io" ghcr.io/subrelay/chain-worker/develop:latest

exit 1