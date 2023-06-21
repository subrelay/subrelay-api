FROM node:18 As development

WORKDIR /app

COPY package*.json ./

# Install dependencies
RUN yarn install

# Copy the rest of the project files to the container
COPY . .

# Build the project
RUN yarn build

USER node

CMD [ "yarn", "start" ]