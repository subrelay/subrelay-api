FROM node:18 As development

# Required for Prisma Client to work in container
RUN apt-get update && apt-get install -y openssl

WORKDIR /usr/src/app

COPY --chown=node:node package*.json ./

RUN npm ci

COPY --chown=node:node . .

RUN npm run build

USER node

CMD [ "node", "dist/main" ]