'use strict';

const express = require('express');
const helmet = require('helmet');
const http = require('http');
const https = require('spdy');
const LEX = require('letsencrypt-express');

const Logger = require('./logger');
const Router = require('./router');

Logger.info('Start ReverseProxy');

let lex = LEX.create({
    configDir: '/letsencrypt',
    approveRegistration: (hostname, cb) => {

        let hostConfig = Router.getHostConfig(hostname),
            isHTTPS = hostConfig && hostConfig.https;

        Logger.info(`Approve registration for domain ${hostname}: ${isHTTPS}`);

        cb(null, {
            domains: [hostname],
            email: 'josselin.buils@gmail.com',
            agreeTos: isHTTPS
        });
    }
});

let app = express();

Router.init();

app.use(helmet());
app.use(Router.checkHost);
app.get('/url/', Router.redirect);
app.use(Router.checkUrl);
app.use(Router.route);

http.createServer(LEX.createAcmeResponder(lex, app)).listen(80);
Logger.info('ReverseProxy is listening on port 80 for HTTP protocol');

https.createServer(lex.httpsOptions, LEX.createAcmeResponder(lex, app)).listen(443);
Logger.info('ReverseProxy is listening on port 443 for HTTPS protocol');