FROM node:18 As development

WORKDIR /app

COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the project files to the container
COPY . .

# Build the project
RUN npm run build

USER node

CMD [ "npm", "start" ]