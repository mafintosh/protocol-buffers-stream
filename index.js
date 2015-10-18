var protobuf = require('protocol-buffers')
var varint = require('varint')
var stream = require('readable-stream')
var util = require('util')
var debug = require('debug')('protocol-buffers-stream')

var Handshake = protobuf('message Handshake { repeated string messages = 1; }').Handshake

var camelize = function (key) {
  return key[0].toLowerCase() + key.slice(1)
}

var compile = function (schema) {
  var messages = protobuf(schema)
  var encodings = []

  var toMessage = function (key) {
    var m = messages[key]
    return m && typeof m.encode === 'function' && typeof m.decode === 'function' && m.name && m
  }

  var handshake = {
    messages: Object.keys(messages).filter(toMessage)
  }

  var Messages = function (opts) {
    if (!(this instanceof Messages)) return new Messages(opts)
    if (!opts) opts = {}
    stream.Duplex.call(this)

    this.destroyed = false
    this._handshake = opts.handshake !== false
    this._missing = 0
    this._buffer = null
    this._header = new Buffer(50)
    this._ptr = 0
    this._events = []
    this._decodings = []
    this._encodings = encodings

    if (this._handshake) this._push(0, handshake)
    else this._onhandshake(handshake)
  }

  util.inherits(Messages, stream.Duplex)

  handshake.messages.forEach(function (key, i) {
    encodings.push(messages[key])
    Messages.prototype[camelize(key)] = function (obj) {
      this._push(i + 1, obj)
    }
  })

  Messages.prototype._push = function (id, obj) {
    if (this.destroyed) return

    var enc = id === 0 ? Handshake : this._encodings[id - 1]
    var len = enc.encodingLength(obj)

    debug('writing %s (id: %d, length: %d)', enc.name, id, len)

    len += varint.encodingLength(id)

    var offset = 0
    var buf = new Buffer(len + varint.encodingLength(len))

    varint.encode(len, buf, offset)
    offset += varint.encode.bytes

    varint.encode(id, buf, offset)
    offset += varint.encode.bytes

    enc.encode(obj, buf, offset)
    this.push(buf)
  }

  Messages.prototype.destroy = function (err) {
    if (this.destroyed) return
    this.destroyed = true
    if (err) this.emit('error', err)
    this.emit('close')
  }

  Messages.prototype.finalize = function () {
    this.push(null)
  }

  Messages.prototype._read = function () {
    // do nothing
  }

  Messages.prototype._write = function (data, enc, cb) {
    while (data && data.length && !this.destroyed) {
      if (this._missing) data = this._onmessage(data)
      else data = this._onheader(data)
    }
    cb()
  }

  Messages.prototype._emit = function () {
    this._missing = 0
    this._ptr = 0

    var id = varint.decode(this._buffer)
    var enc = id === 0 ? Handshake : this._decodings[id - 1]
    var evt = id > 0 && this._events[id - 1]

    if (!enc) {
      debug('unknown (id: %d)', id)
      return this.emit('unknown', id)
    }

    try {
      var obj = enc.decode(this._buffer, varint.decode.bytes)
    } catch (err) {
      debug('invalid %s (id: %d, length: %d)', enc.name, id, this._buffer.length)
      return this.emit('invalid', evt, this._buffer)
    }

    debug('received %s (id: %d, length: %d)', enc.name, id, this._buffer.length)
    if (enc !== Handshake) return this.emit(evt, obj)

    this._onhandshake(obj)

    return false
  }

  Messages.prototype._onhandshake = function (obj) {
    for (var i = 0; i < obj.messages.length; i++) {
      this._decodings[i] = toMessage(obj.messages[i]) || null
      this._events[i] = this._decodings[i] && camelize(this._decodings[i].name)
    }
  }

  Messages.prototype._onmessage = function (data) {
    var overflow = null

    if (!this._buffer) {
      if (data.length === this._missing) {
        this._buffer = data
        this._emit()
        return null
      }

      if (data.length > this._missing) {
        this._buffer = data.slice(0, this._missing)
        overflow = data.slice(this._missing)
        this._emit()
        return overflow
      }

      this._buffer = new Buffer(this._missing)
    }

    if (data.length === this._missing) {
      data.copy(this._buffer, this._ptr)
      this._emit()
      return null
    }

    if (data.length > this._missing) {
      data.slice(0, this._missing).copy(this._buffer, this._ptr)
      overflow = data.slice(this._missing)
      this._emit()
      return overflow
    }

    data.copy(this._buffer, this._ptr)
    this._ptr += data.length
    this._missing -= data.length

    return null
  }

  Messages.prototype._onheader = function (data) {
    for (var i = 0; i < data.length; i++) {
      this._header[this._ptr++] = data[i]
      if (data[i] & 0x80) continue
      this._ptr = 0
      this._missing = varint.decode(this._header)
      this._buffer = null
      debug('expecting message (length: %d)', this._missing)
      return data.slice(i + 1)
    }
    return null
  }

  return Messages
}

module.exports = compile
