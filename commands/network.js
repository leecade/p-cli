'use strict'

var os = require('os')
var net = require('net')
var dns = require('native-dns')
var onetime = require('onetime')
var eachAsync = require('each-async')

var domains = [
  'www.google.com',
  'www.cloudflare.com',
  'www.baidu.com',
  'www.yandex.ru'
]

var timeout = 1000;

var internalIp = function () {
  var ret = '127.0.0.1'
  var interfaces = os.networkInterfaces()
  Object.keys(interfaces).forEach(function (el) {
    interfaces[el].forEach(function (el2) {
      if (!el2.internal && el2.family === 'IPv4') {
        ret = el2.address
      }
    })
  })
  return ret
}

var publicIp = function (cb) {
  var req = dns.Request({
    server: {
      address: '208.67.222.222', // OpenDNS
      port: 53,
      type: 'udp'
    },
    question: dns.Question({
      name: 'myip.opendns.com',
      type: 'A'
    })
  })

  req.on('timeout', function () {
    cb(new Error('Request timed out'))
  })

  req.on('message', function (err, res) {
    var ip = res.answer[0] && res.answer[0].address

    if (!ip) {
      cb(new Error('Couldn\'t find your IP'))
    }

    cb(null, ip)
  })

  req.send()
}

var isOnline = function(cb) {
  var isDone = false
  eachAsync(domains, function (domain, i, done) {
    var socket = new net.Socket();
    done = onetime(done);

    socket.setTimeout(timeout);

    socket.on('timeout', function () {
      socket.destroy();
      done();
    });

    socket.on('error', function () {
      socket.destroy();
      done();
    });

    socket.connect(80, domain, function () {
      !isDone && cb(null, true);
      isDone = true
      socket.end();
      done(new Error()); // skip to end
    });
  }, function () {
    !isDone && cb(null, false);
  });
}

module.exports = {
  publicIp: publicIp,
  internalIp: internalIp,
  isOnline: isOnline
}