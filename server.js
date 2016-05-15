'use strict';

const express = require('express');
const httpProxy = require('http-proxy');

const config = require('./config.json');
const Logger = require('./logger');

const app = express();
const proxy = httpProxy.createProxyServer({});

app.get('*', (req, res) => {

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

    if (matchingRoute) {
        proxy.web(req, res, {target: matchingRoute.target});
    } else {
        res.status(404).send('Not found');
    }
});

app.listen(config.port);
Logger.info('ReverseProxy is listening on port ' + config.port);