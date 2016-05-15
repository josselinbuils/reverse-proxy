'use strict';

const LEX = require('letsencrypt-express');

const HTTPProxy = require('./src/httpproxy');
const HTTPSProxy = require('./src/httpsproxy');
const Logger = require('./src/logger');
const Router = require('./src/router');

Logger.info('Start ReverseProxy');

Router.init();
//HTTPProxy.start();
HTTPSProxy.start();