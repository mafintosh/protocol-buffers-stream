var protobufs = require('../')
var fs = require('fs')
var path = require('path')

var schema = fs.readFileSync(path.join(__dirname, 'example.proto'))
var createStream = protobufs(schema)

var client = createStream()
var server = createStream()

client.request({
  hello: 'world'
})

client.on('response', function (response) {
  console.log('server says:', response)
})

server.on('request', function (request) {
  console.log('client says:', request)
  server.response({
    echo: request
  })
})

client.pipe(server).pipe(client)
