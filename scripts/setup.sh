#!/bin/bash
source ./install-dependencies.sh

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

# Set up environment
if [ "$1" == "dev" ]; then
  echo "Running in development environment."
elif [ "$1" == "prod" ]; then
  echo "Running in production environment."
elif [ "$1" == "" ]; then
  echo "Using development environment as default."
else
  echo "Invalid environment. Possible values: prod and develop. Exiting..."
  exit 1
fi

$folder = "subrelay-backend"

mkdir $folder
cd $folder

# Event service
git clone https://github.com/subrelay/event-service.git
cd event-service
git checkout $1
docker build -t subrelay-event-service .


# API
cd ..
git clone https://github.com/subrelay/subrelay-api.git
cd subrelay-api
git checkout $1
echo "Please edit .env file in subrelay-api folder!"
exit 1