# nanium-channel-express-rest

A nanium request channel based on express using multiple REST-style endpoints.

## Install
```bash
npm install nanium-channel-express-rest
```

## Usage
```ts
import { Nanium } from 'nanium/core';
import { NaniumExpressHttpChannel } from 'nanium-channel-express-rest';
import * as express from 'express';

const expressApp: express.Express = express(); 
  
await Nanium.addManager(new NaniumNodejsProvider({
  requestChannels: [
    new NaniumExpressHttpChannel({
      apiPath: '/api',
      server: expressApp,
      executionContextConstructor: Object
    })
  ]
}));
```

Creates a HTTP endpoint for each service based on the service name.

Which HTTP method is used depends on the name of the contract.ts file;

GET:
- get.contract.ts
- query.contract.ts

PUT:
- update.contract.ts
- change.contract.ts
- store.contract.ts
- put.contract.ts

DELETE:
- remove.contract.ts
- delete.contract.ts

POST:
- create.contract.ts
- add.contract.ts
- post.contract.ts
- everything else
