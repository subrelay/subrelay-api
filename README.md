# Set up locally

## Clone repo

```
git clone git@github.com:subrelay/subrelay-api.git
cd subrelay-api
npm install
```
## Update .env file

## Build docker image

```
docker-compose up -d --build -V
```

API URL: http://localhost:3000
pgAdmin URL: http://localhost:5050


# Migration

## Generate new migration
```
yarn run prisma:migrate -name "your migration name"
```

## Check status
```
yarn run prisma:status
```

## Generate Prisma client

```
yarn run prisma:migrate
```