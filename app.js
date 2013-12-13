
/**
 * Module dependencies.
 */

var express = require('express')
  , routes  = require('./routes')
  , http    = require('http')
  , path    = require('path')
  , ejs     = require('ejs')
  , nconf   = require('nconf')
  , jQuery  = require('jquery')
  , fs      = require('fs')
  , expressValidator = require('express-validator')
  , gravatar         = require('gravatar');

jQuery.extend(ejs.filters, require('./filters'));

nconf.env().argv();

if (fs.existsSync('config.json')) {
  nconf.file('config.json');
}

var app = express();

app.configure(function(){
  app.set('port', nconf.get('app:port') || 3000);
  app.use(function (req, res, next) {
    req.nconf = nconf;
    return next();
  });
  app.use(express.compress());
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.bodyParser());
  app.use(expressValidator({
    errorFormatter: function(param, msg, value) {
      return msg;
    }
  }));
  app.use(express.logger('dev'));
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
  app.locals.pretty = true;
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

app.locals(nconf.get());

app.locals.app.favicon = {
  apple: gravatar.url(
    nconf.get('gravatar:email'),
    {s: 256, r: 'x', d: 'retro'},
    true
  ),
  web: gravatar.url(
    nconf.get('gravatar:email'),
    {s: 16, r: 'x', d: 'retro'},
    true
  )
};

app.locals.app.enviroment = process.env.NODE_ENV;

app.get('/', routes.index);
app.post('/', routes.index);

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
