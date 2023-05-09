#!/bin/bash

# Set up dependencies
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

# Set up environment
branch=""
if [ "$1" == "--env=dev" ]; then
  echo "Running in development environment."
  branch="develop"
elif [ "$1" == "--env=prod" ]; then
  echo "Running in production environment."
  branch="main"
elif [ "$1" == "" ]; then
  echo "Using development environment as default."
else
  echo "Invalid environment. Possible values: prod and develop. Exiting..."
  exit 1
fi

# Set up environment
clearAll=False
if [ "$2" == "--clear-all" ]; then
  echo "Running in development environment."
  clearAll=true
fi


cd subrelay-backend/subrelay-api
git checkout $branch
git reset --hard
git pull
docker-compose up -d --build