require('dotenv').config();
var express = require('express');

var fs = require('fs');
var slugify = require('slugify');
// cookies see https://github.com/expressjs/cookie-parser
var cookieParser = require('cookie-parser');
// var cookieSession = require('cookie-session');
var bodyParser = require('body-parser');
var session = require('express-session');
var multer = require('multer');
var util = require('util');
var mime = require('mime');
var compression = require('compression');
var compressible = require('compressible');
var cache = require('apicache').middleware;

var path = require("path");
var temp_dir = path.join(process.cwd(), 'temp/');
var uploads_dir = path.join(process.cwd(), 'uploads/');
// require('ssl-root-cas').inject().addFile('./server.crt');

var API_OFF = false;

// This should remain disabled for most people, this is enabled for our production environment
var rateLimitingEnabled = process.env.RATE_LIMITING_ENABLED || false;

var RateLimit, ExpressMiddleware, redis, rateLimiter, options, limitMiddleware;

if (rateLimitingEnabled) {
   RateLimit = require('ratelimit.js').RateLimit;
   ExpressMiddleware = require('ratelimit.js').ExpressMiddleware;
redis = require('redis');

   rateLimiter = new RateLimit(redis.createClient(process.env.REDIS_URL), [{interval: parseInt(process.env.RATE_LIMITING_INTERVAL), limit: parseInt(process.env.RATE_LIMITING_REQUESTS)}]);

   options = {
    ignoreRedisErrors: true // defaults to false
  };
  limitMiddleware = new ExpressMiddleware(rateLimiter, options);
}

if (!fs.existsSync(temp_dir)) {
    fs.mkdirSync(temp_dir);
}

if (!fs.existsSync(uploads_dir)) {
    fs.mkdirSync(uploads_dir);
}

var storage = multer.memoryStorage();
var upload = multer({ storage: storage });

//local modules (JS files)
// var utils = require('./utils');
var SentimentAnalysis = require('./lib/sentiment-analysis.js');
var EntityAnalysis = require('./lib/entity-analysis.js');
var LanguageAnalysis = require('./lib/language-analysis.js');
var ImageAnalysis = require('./lib/image-analysis.js');
var NXAPIPacks = require('./lib/api-connector/api-connector.js');

createEJSTemplateDataDictionary = function (req, res) {
 // Set a body class hook to append to <body>
  var localBodyClass = '';
  if(req.originalUrl === '/') {
  localBodyClass = 'home';
  } else {
  localBodyClass = slugify(req.originalUrl.replace(/\//g, ' '));
 }
  return { session: req.session, activeRoute: req.activeRoute, recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY, bodyClass: localBodyClass };
};

//storage
// var session = require('express-session');
// var RedisStore = require('connect-redis')(session);

var app = express();
// var privateKey  = fs.readFileSync('./key.pem', 'utf8');
// var certificate = fs.readFileSync('./server.crt', 'utf8');
// var credentials = {key: privateKey, cert: certificate};

app.set('port', (process.env.PORT || 5000));

var cookiesSecretKey = (process.env.COOKIES_SECRET_KEY || 'cookiesSecret');

app.use(cookieParser(cookiesSecretKey));

//for now use cookie session (in-memory)
app.use(session({  secret: cookiesSecretKey }));

//
// app.use(session({
//     store: new RedisStore(options),
//     secret: 'secretdata'
// }));

app.use(bodyParser.urlencoded({ limit:'2mb', extended: true })); // for parsing

app.use(express.static(__dirname + '/public'));


// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');


app.use(compression());

//add current route to the request so templates can extract it
app.use(function(req, res, next) {
 req.activeRoute = req.path.split('/')[1] // [0] will be empty since routes start with '/'
    next();
});

app.use(function (req, res, next) {
  if (req.originalUrl.substring(0,4) === '/api' && API_OFF) {
    return {success: false};
 return {success: false};
  }

  next();
});

if (limitMiddleware) {
  app.use('/api', limitMiddleware.middleware(function(req, res, next) {
  res.status(429).json({message: 'rate limit exceeded'});
  }));
}

var markdownCache = Object.create(null);
var SectionPageProcessor = require('./lib/section-page-processor.js');

//docs route - use markdown files as content source for pages
app.get('/docs/*', function(req, res) {

    var dataDict = createEJSTemplateDataDictionary(req, res);
 SectionPageProcessor.processMarkdownPage(dataDict, req, res, markdownCache);

});

app.get('/contact', function(req, res) {
  res.render('pages/contact', createEJSTemplateDataDictionary(req, res));
