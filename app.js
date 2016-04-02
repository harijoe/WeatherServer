var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var request = require('request');
var storage = require('node-persist');

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();
var server = require('http').Server(app);

var port = 3000;
var storeURL = 'http://vallini.io:8080/weather_measures';
server.listen(port);
console.log('server started on port : ' + port);

storage.initSync();

var rpiAddress = 'http://raspi.vallini.io:3000';
var rpiSocket = require('socket.io-client')(rpiAddress);

var timer = Date.now();

var ioServer = require('socket.io')(server);
ioServer.on('connection', function (socket) {
  socket.on('take_picture', function () {
    console.log('Take picture');
    rpiSocket.emit('take_picture');
  });
  socket.on('client_connected', function () {
    console.log('A new client connected');
  });
  console.log('photo url: '+storage.getItem('photo_url'));
  ioServer.emit('photo_ready', storage.getItem('photo_url'));
});

rpiSocket.on('connect', function () {
  // we alert the front that we reached the RPI
  console.log('connected to raspi');
  ioServer.emit('raspi_connected');
});

rpiSocket.on('photo_ready', function (url) {
  console.log('New photo available: '+url);
  storage.setItem('photo_url',url);
  ioServer.emit('photo_ready', this.url);
}.bind(this));

rpiSocket.on('arduino_emitting', function (data) {
  // TODO Save to DB
  console.log(data);
  ioServer.emit('arduino_emitting', data);

  if ((Date.now() - timer) > 15 * 60 * 1000) {
    console.log('Saving ...');
    request({
        url: storeURL,
        method: 'POST',
        json: {
          _format: 'json',
          measureDateTime: Date.now(),
          temperature: data.t,
          luminance: data.lumi,
          humidity: data.h
        }
      },
      function (error, response, body) {
        if (!error && response.statusCode >= 200 && response.statusCode < 300) {
          console.log(body);
        } else {
          console.log(error);
          console.log(body);
        }
      }
    );
    timer = Date.now();
  }
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
