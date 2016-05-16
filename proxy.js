'use strict';

const LEX = require('letsencrypt-express');

const HTTPProxy = require('./src/httpproxy');
const HTTPSProxy = require('./src/httpsproxy');
const Logger = require('./src/logger');
const Router = require('./src/router');

Logger.info('Start ReverseProxy');

let lex = LEX.create({
    configDir: '/letsencrypt',
    approveRegistration: function (hostname, cb) {

        let isHTTPS = HTTPSProxy.isHTTPSDomain(hostname);

        Logger.info(`Approve registration for domain ${hostname}: ${isHTTPS}`);

        cb(null, {
            domains: [hostname],
            email: 'josselin.buils@gmail.com',
            agreeTos: isHTTPS
        });
    }
});

Router.init();
HTTPProxy.start(lex);
HTTPSProxy.start(lex);