'use strict';

const express = require('express');
const helmet = require('helmet');
const httpProxy = require('http-proxy');
const LEX = require('letsencrypt-express').testing();
const morgan = require('morgan');

const config = require('./config.json');
const Logger = require('./logger');

const app = express();
const proxy = httpProxy.createProxyServer({});


app.use(morgan('dev'));
app.use(helmet());

var lex = LEX.create({
    configDir: require('os').homedir() + '/letsencrypt/etc',
    approveRegistration: function (hostname, cb) {
        cb(null, {
            domains: ['pizzaday.party', 'www.pizzaday.party'],
            email: 'josselin.buils@gmail.com',
            agreeTos: true
        });
    }
});

app.use(function (req, res) {
    res.send({ success: true });
});

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
        console.log(process.env);
        let target = process.env[matchingRoute.service.toUpperCase() + '_PORT'];
        Logger.info(`Redirect request ${request} to ${target}`);
        proxy.web(req, res, {target: target});
    } else {
        Logger.info(`No route found for request ${request}`);
        res.status(404).send('Not found');
    }
});

lex.onRequest = app;

lex.listen([80], [443, 5001], function () {
    let protocol = ('requestCert' in this) ? 'https': 'http';
    Logger.info(`ReverseProxy is listening on port ${this.address().port} using ${protocol} protocol`);
});