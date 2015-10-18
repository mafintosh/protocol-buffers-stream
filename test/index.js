var fs = require('fs')
var through = require('through2')
var path = require('path')
var tape = require('tape')
var protobufs = require('../')

var createStream = protobufs(fs.readFileSync(path.join(__dirname, './test.proto')))

var chunk = function () {
  return through(function (data, enc, cb) {
    while (data.length) {
      var l = Math.floor(Math.random() * data.length) + 1
      this.push(data.slice(0, l))
      data = data.slice(l)
    }
    cb()
  })
}

tape('1 message', function (t) {
  var stream = createStream()

  stream.test({
    foo: new Buffer('bar')
  })

  stream.on('test', function (m) {
    t.same(m, {foo: new Buffer('bar')})
    t.end()
  })

  stream.pipe(stream)
})

tape('2 messages', function (t) {
  t.plan(2)

  var stream = createStream()

  var messages = [{
    foo: new Buffer('one')
  }, {
    foo: new Buffer('two')
  }]

  stream.test(messages[0])
  stream.test(messages[1])

  stream.on('test', function (m) {
    t.same(m, messages.shift())
  })

  stream.pipe(stream)
})

tape('multi type messages', function (t) {
  t.plan(6)

  var stream = createStream()

  var tests = [{
    foo: new Buffer('one')
  }, {
    foo: new Buffer('two')
  }]

  var anothers = [{
    test: 'hej'
  }, {
    test: ''
  }]

  var anotherOnes = [{
    foo: 1,
    bar: 'foo'
  }, {
    foo: 100,
    bar: 'bar'
  }]

  stream.anotherOne(anotherOnes[0])
  stream.anotherOne(anotherOnes[1])
  stream.test(tests[0])
  stream.another(anothers[0])
  stream.test(tests[1])
  stream.another(anothers[1])

  stream.on('anotherOne', function (m) {
    t.same(m, anotherOnes.shift())
  })

  stream.on('test', function (m) {
    t.same(m, tests.shift())
  })

  stream.on('another', function (m) {
    t.same(m, anothers.shift())
  })

  stream.pipe(stream)
})

tape('multi type messages + no handshake', function (t) {
  t.plan(6)

  var stream = createStream({handshake: false})

  var tests = [{
    foo: new Buffer('one')
  }, {
    foo: new Buffer('two')
  }]

  var anothers = [{
    test: 'hej'
  }, {
    test: ''
  }]

  var anotherOnes = [{
    foo: 1,
    bar: 'foo'
  }, {
    foo: 100,
    bar: 'bar'
  }]

  stream.anotherOne(anotherOnes[0])
  stream.anotherOne(anotherOnes[1])
  stream.test(tests[0])
  stream.another(anothers[0])
  stream.test(tests[1])
  stream.another(anothers[1])

  stream.on('anotherOne', function (m) {
    t.same(m, anotherOnes.shift())
  })

  stream.on('test', function (m) {
    t.same(m, tests.shift())
  })

  stream.on('another', function (m) {
    t.same(m, anothers.shift())
  })

  stream.pipe(stream)
})

tape('chunked 1 message', function (t) {
  var stream = createStream()

  stream.test({
    foo: new Buffer('bar')
  })

  stream.on('test', function (m) {
    t.same(m, {foo: new Buffer('bar')})
    t.end()
  })

  stream.pipe(chunk()).pipe(stream)
})

tape('chunked 2 messages', function (t) {
  t.plan(2)

  var stream = createStream()

  var messages = [{
    foo: new Buffer('one')
  }, {
    foo: new Buffer('two')
  }]

  stream.test(messages[0])
  stream.test(messages[1])

  stream.on('test', function (m) {
    t.same(m, messages.shift())
  })

  stream.pipe(chunk()).pipe(stream)
})

tape('chunked multi type messages', function (t) {
  t.plan(6)

  var stream = createStream()

  var tests = [{
    foo: new Buffer('one')
  }, {
    foo: new Buffer('two')
  }]

  var anothers = [{
    test: 'hej'
  }, {
    test: ''
  }]

  var anotherOnes = [{
    foo: 1,
    bar: 'foo'
  }, {
    foo: 100,
    bar: 'bar'
  }]

  stream.anotherOne(anotherOnes[0])
  stream.anotherOne(anotherOnes[1])
  stream.test(tests[0])
  stream.another(anothers[0])
  stream.test(tests[1])
  stream.another(anothers[1])

  stream.on('anotherOne', function (m) {
    t.same(m, anotherOnes.shift())
  })

  stream.on('test', function (m) {
    t.same(m, tests.shift())
  })

  stream.on('another', function (m) {
    t.same(m, anothers.shift())
  })

  stream.pipe(chunk()).pipe(stream)
})
