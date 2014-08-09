# protocol-buffers-stream

Streaming protocol buffers for Node.js

```
npm install protocol-buffers-stream
```

[![build status](http://img.shields.io/travis/mafintosh/protocol-buffers-stream.svg?style=flat)](http://travis-ci.org/mafintosh/protocol-buffers-stream)

## Usage

Assuming you have the following schema

```
message Test {
  required string hello = 1;
}
```

Run the following example

``` js
var protobufs = require('protocol-buffers-stream')
var fs = require('fs')

var schema = fs.readFileSync('schema.proto')
var createStream = protobufs(schema)

var stream = createStream()

// send a test message
// if your schema message was named example this method would be called example
stream.test({
  hello: 'world'
})

// receive a test message
stream.on('test', function(m) {
  console.log(m)
})

// just pipe to ourselves for testing
stream.pipe(stream)
```

## Encoding

Each buffer is sent using the following encoding

```
----------------------------------------------
| frame length | message id | message buffer |
----------------------------------------------
```

The first message sent is a handshake message that contains the message
ids of the following messages

If you know that your schema won't change you can pass `{handshake:false}` to `createStream`
to disable handshaking

## License

MIT