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


if [ -x "$(command -v docker-compose)" ]; then
  docker-compose --version
else
  echo "Docker Compose is not installed. Installing..."
  sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  sudo chmod +x /usr/local/bin/docker-compose
fi

if [ -x "$(command -v git)" ]; then
  git --version
else
  echo "Git is not installed. Installing..."
  sudo apt-get update
  sudo apt-get install git -y
fi


$folder = "subrelay-backend"

mkdir $folder
cd $folder

# Event service
git clone https://github.com/subrelay/chain-worker.git
cd chain-worker
yarn install --production --frozen-lockfile
yarn global add @nestjs/cli
yarn run build

# API
cd ..
git clone https://github.com/subrelay/subrelay-api.git
cd subrelay-api
git checkout main

exit 1