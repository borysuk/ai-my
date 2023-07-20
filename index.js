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
