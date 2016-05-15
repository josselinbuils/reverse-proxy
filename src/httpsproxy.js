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
            configDir: require('os').homedir() + '/letsencrypt/etc',
            approveRegistration: function (hostname, cb) {
                if (HTTPSProxy.isHTTPSDomain(hostname)) {
                    Logger.info(`Approve registration for domain ${hostname}`);

                    cb(null, {
                        domains: [hostname],
                        email: 'josselin.buils@gmail.com',
                        agreeTos: true
                    });
                }
            }
        });

        let app = express();

        app.use(helmet());

        app.all('*', (req, res) => {

            if (!HTTPSProxy.isHTTPSDomain(req.hostname)) {
                Logger.info(`${req.hostname} is not a HTTPS domain, use HTTP protocol instead of HTTPS`);
                return res.redirect('http://' + req.headers.host + req.url);
            }

            Router.route(req, res);
        });

        https.createServer(lex.httpsOptions, LEX.createAcmeResponder(lex, app)).listen(443);

        Logger.info('ReverseProxy is listening on port 443 for HTTPS protocol');
    }
};