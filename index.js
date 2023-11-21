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

if (!fs.existsSync(uploads_dir)) 
