# Subrelay API

This is the API server for the Subrelay project. It handles all API requests and provides data to the front-end.

## Getting Started
These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites
- Node.js
- Yarn
- Redis
- Postgres

### Installing
1. Clone the repository
```
$ git clone https://github.com/subrelay/subrelay-api.git
```

2. Navigate to the project directory
```
$ cd subrelay-api
```

3. Rename `.env.dist` to `.env` and update values in that file

4. Install the dependencies
```
$ yarn install
```

5. Start the server
```
$ yarn start
```

### Migration

#### Generate new migration
```
yarn run typeorm migration:generate ./src/migration/{your_migration_name}
```

#### Run migration
```
yarn run typeorm migration:run
```

#### Revert migration

```
yarn run typeorm migration:revert
```


## Self-hosting
Docker is required.

### Installing SubRelay API
### Clone the repository
- [Event service](https://github.com/subrelay/event-service)

### Build Event Service to a docker image
Running command:
```
cd event-service
docker build -t subrelay-event-service .
```

### Start the server
> Database and Redis environment variables in Event Service and Subrelay API are the same.

Running command:
```
cd subrelay-api
docker-compose up -d --build
```

Go to http://localhost:3000/ to check.


## API Reference
For more details on the API, check the [API documentation](http://localhost:3000/api).

## Authentication
### Request header
```
{
  "Authorization": "Your toke here"
}
```

### How to generate a token?
```
import { stringToU8a, u8aToHex } from '@polkadot/util';

const message = JSON.stringify({ endpoint, method, body, timestamp });
const signature = sign(stringToHex(messsage));
const token = JSON.stringify({ address, timestamp, signature }).toString('base64');
```
### GET token
GET token is used for GET endpoints. Where the endpoint, method, and body  values are fixed. You need to sign it once and use it for all GET endpoints until it expires.

For example:
```
{
    "endpoint": "/*",
    "method": "GET",
    "body": {},
    "timestamp": 1669702265438
}
```
### ACTION token
ACTION token is used for POST, PUT, DELETE  endpoints. Where the endpoint, method, and body  values are depend on each request.

For example:
```
{
    "endpoint": "/workflows",
    "method": "POST",
    "body": {
        "name": "workflow 2",
        "chainUuid": "9f294e84-0a4e-497b-95dc-785c06c1a2f0",
        "tasks": []
    },
    "timestamp": 1669702265438
}
```

### How long token is expired ?
Authentication token expiration is 1 day.
### How admin can access the API?
If you want to access the API as an admin, you must:
- Define your account address when setup API.
- Using GET token to access the API.
