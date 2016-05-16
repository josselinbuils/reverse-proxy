'use strict';

const LEX = require('letsencrypt-express');

const HTTPProxy = require('./httpproxy');
const HTTPSProxy = require('./httpsproxy');
const Logger = require('./logger');
const Router = require('./router');

Logger.info('Start ReverseProxy');

let lex = LEX.create({
    configDir: '/letsencrypt',
    approveRegistration: HTTPSProxy.approveRegistration
});

Router.init();
HTTPProxy.start(lex);
HTTPSProxy.start(lex);