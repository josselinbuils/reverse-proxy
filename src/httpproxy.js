'use strict';

const express = require('express');
const helmet = require('helmet');
const http = require('http');
const LEX = require('letsencrypt-express');

const config = require('../config.json');
const HTTPSProxy = require('./httpsproxy');
const Logger = require('./logger');
const Router = require('./router');

module.exports = class HTTPProxy {
    static start(lex) {
        Logger.info('Start HTTP proxy');

        let app = express();

        app.use(helmet());

        app.use((req, res, next) => {

            let addPrefix = !/^www\./.test(req.hostname) && req.hostname.split('.').length === 2,
                hostname = addPrefix ? 'www.' + req.hostname : req.hostname;

            if (HTTPSProxy.isHTTPSDomain(req.hostname)) {
                Logger.info(req.hostname + ' is a HTTPS domain, use HTTPS instead of HTTP');

                Logger.info(`Redirect from ${req.protocol}://${req.hostname + req.url} to https://${hostname}${req.url}`);
                return res.redirect('https://' + hostname + req.url);

            } else if (addPrefix) {
                Logger.info(`Redirect from ${req.protocol}://${req.hostname}${req.url} to http://${hostname}${req.url}`);
                return res.redirect('http://' + hostname + req.url);
            }

            next();
        });

        app.use(Router.route);

        http.createServer(LEX.createAcmeResponder(lex, app)).listen(80);

        Logger.info('ReverseProxy is listening on port 80 for HTTP protocol');
    }
};