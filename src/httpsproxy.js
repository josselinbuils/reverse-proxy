'use strict';

const express = require('express');
const helmet = require('helmet');
const https = require('spdy');
const LEX = require('letsencrypt-express');

const config = require('../config.json');
const Logger = require('./logger');
const Router = require('./router');

module.exports = class HTTPSProxy {

    static isHTTPSDomain(domain) {
        return config.httpsDomains.indexOf(domain) !== -1;
    }

    static start() {
        Logger.info('Start HTTPS proxy');

        let lex = LEX.create({
            configDir: '/letsencrypt',
            approveRegistration: function (hostname, cb) {
                if (HTTPSProxy.isHTTPSDomain(hostname)) {
                    Logger.info(`Approve registration for domain ${hostname}`);

                    cb(null, {
                        domains: [hostname],
                        email: 'josselin.buils@gmail.com',
                        agreeTos: true
                    });

                } else {
                    Logger.info(`${hostname} is not a HTTPS domain`);
                }
            }
        });

        let app = express();

        app.use(helmet());

        app.all('*', Router.route);

        https.createServer(lex.httpsOptions, LEX.createAcmeResponder(lex, app)).listen(443);

        Logger.info('ReverseProxy is listening on port 443 for HTTPS protocol');
    }
};