# protocol-buffers-stream

Streaming protocol buffers for Node.js

```
npm install protocol-buffers-stream
```

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

The message id is the message position in the schema file (first message is 0, second is 1, etc).
If you add new messages make sure to add them add the bottom of the schema file.

## License

MIT