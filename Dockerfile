FROM node:18-alpine

WORKDIR /app

COPY package.json yarn.lock ./
COPY . .

RUN yarn install --production --frozen-lockfile
RUN yarn global add @nestjs/cli
RUN yarn build

CMD ["node", "--max-old-space-size=300", "dist/main.js"]