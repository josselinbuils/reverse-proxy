'use strict';

const express = require('express');
const helmet = require('helmet');
const http = require('http');
const httpProxy = require('http-proxy');
const https = require('spdy');
const LEX = require('letsencrypt-express');
const morgan = require('morgan');

const config = require('./config.json');
const Logger = require('./logger');

var lex = LEX.create({
    configDir: require('os').homedir() + '/letsencrypt/etc',
    approveRegistration: function (hostname, cb) {
        cb(null, {
            domains: [hostname],
            email: 'josselin.buils@gmail.com',
            agreeTos: true
        });
    }
});

let httpServer = http.createServer(LEX.createAcmeResponder(lex, (req, res) => {
    res.setHeader('Location', 'https://' + req.headers.host + req.url);
    res.statusCode = 302;
    res.end();
}));

httpServer.listen(80);
Logger.info('ReverseProxy is listening on port 80 for http protocol');

const app = express();
const proxy = httpProxy.createProxyServer({});

app.use(morgan('dev'));
app.use(helmet());

app.all('*', (req, res) => {

    let matchingRoute;

    for (let i = 0; i < config.map.length && !matchingRoute; i++) {

        let route = config.map[i];

        for (let j = 0; j < route.hosts.length; j++) {
            let splitHost = route.hosts[j].split('/');
            let hostname = splitHost[0];

            let match = hostname === req.hostname;

            if (splitHost.length > 1) {
                let escapedPath = splitHost[1].replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
                match = match && new RegExp('^\/' + escapedPath).test(req.path);
            }

            if (match) {
                matchingRoute = route;
                break;
            }
        }
    }

    let request = req.protocol + '://' + req.hostname + req.path;

    if (matchingRoute) {
        let target = process.env[matchingRoute.service.toUpperCase() + '_PORT'];
        Logger.info(`Redirect request ${request} to ${target}`);
        proxy.web(req, res, {target: target});
    } else {
        Logger.info(`No route found for request ${request}`);
        res.status(404).send('Not found');
    }
});

let httpsServer = https.createServer(lex.httpsOptions, LEX.createAcmeResponder(lex, app));

httpsServer.listen(443);
Logger.info('ReverseProxy is listening on port 443 for https protocol');