require('dotenv').config();
var express = require('express');

var fs = require('fs');
var slugify = require('slugify');
// cookies see https://github.com/expressjs/cookie-parser
var cookieParser = require('cookie-parser');
