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
npm run typeorm migration:generate ./src/migration/{your_migration_name}
```

## Run migration
```
npm run typeorm migration:run
```

## Revert migration

```
npm run typeorm migration:revert
```