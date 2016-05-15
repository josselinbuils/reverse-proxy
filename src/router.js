'use strict';

const httpProxy = require('http-proxy');

const config = require('../config.json');
const Logger = require('./logger');

let proxy;

module.exports = class Router {

    static init() {
        Logger.info(`Initialize router`);
        proxy = httpProxy.createProxyServer({});
    }

    static route(req, res) {

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

            if (target) {
                Logger.info(`->${matchingRoute.service}: ${req.method} ${request}`);
                proxy.web(req, res, {target: target});
            } else {
                Logger.error(`Address of ${matchingRoute.service} not found: ${req.method} ${request}`);
                res.status(500).send('Internal server error');
            }

        } else {
            Logger.info(`No route found: ${req.method} ${request}`);
            res.status(404).send('Not found');
        }
    }
};