<div align="center">
    <h1>@ayios/rpc</h1>
    <h3><b>Ayios RPC System</b></h3>
    <h6>This is primarily used internally by Ayios. It is free for anyone to use.</h6>
</div>

## Introduction

There are three classes: RPCExecutor, RPCListener, and RPCMulti (a combination of a listener and executor).
You need Redis and will use pub/sub.

RPCMulti does open two Redis connections.

## Example
```typescript
import { RPCMulti } from '@ayios/rpc';
import Redis from 'ioredis';

const redisClient = new Redis({ host: process.env.REDIS_HOST });
const rpc = new RPCMulti('messages_production', redisClient);

// You must define a code (a number, or ideally referred to as an opcode) to listen to
const uniqueListenerID = rpc.onEvent<string>(1, data => {
    // Data can be anything serializable into JSON
    console.log('New data', data);
});

// You can also remove listeners
rpc.removeListener(uniqueListenerID); // Remove the unique listener inance
rpc.removeListener(1) // Remove all listeners with the `1` opcode


// To send an event:
const result = rpc.sendEvent(1, 'this is a message');
// The result of sendEvent is what the ioredis 'publish' response is.
// I believe it is how many clients the event was sent to.

```

## License
All code within this repository created by Ayios is under MIT license. Other code within this repository, if present, is under its own respective license which will be displayed within their respective files.