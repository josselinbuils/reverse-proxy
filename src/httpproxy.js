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
    static start() {
        Logger.info('Start HTTP proxy');

        let app = express();

        app.use(helmet());

        app.all('*', (req, res) => {

            if (HTTPSProxy.isHTTPSDomain(req.hostname)) {
                Logger.info(`${req.hostname} is a HTTPS domain, use HTTPS instead of HTTP`);
                return res.redirect('https://' + req.headers.host + req.url);
            }

            Router.route(req, res);
        });

        http.createServer(LEX.createAcmeResponder(lex, app)).listen(80);

        Logger.info('ReverseProxy is listening on port 80 for HTTP protocol');
    }
};