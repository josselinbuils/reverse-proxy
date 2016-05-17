'use strict';

const httpProxy = require('http-proxy');

const constants = require('./constants.json');
const config = require('../config.json');
const Logger = require('./logger');

let proxy;

module.exports = class Router {

    static checkHost(req, res, next) {

        let hostConfig = Router.getHostConfig(req.hostname);

        if (hostConfig === undefined) {
            return res.status(403).end('Unknown host');
        }

        req.hostConfig = hostConfig;

        next();
    }

    static checkUrl(req, res, next) {

        let addPrefix = !/^www\./.test(req.hostname) && req.hostname.split('.').length === 2;

        if (req.protocol !== 'https' && req.hostConfig.https && req.hostConfig.forceHttps) {
            Logger.info(req.hostname + ' is a HTTPS only domain, use HTTPS instead of HTTP');

            let newUrl = 'https://' + (addPrefix ? 'www.' : '') + req.hostname + req.url;

            Logger.info(`Redirect from ${req.protocol}://${req.hostname + req.url} to ${newUrl}`);
            return res.redirect(newUrl);

        } else if (addPrefix) {
            let newUrl = req.protocol + '://www.' + req.hostname + req.url;

            Logger.info(`Redirect from ${req.protocol}://${req.hostname}${req.url} to ${newUrl}`);
            return res.redirect(newUrl);
        }

        next();
    }

    static getHostConfig(hostname) {
        return config.hosts[/^www\./.test(hostname) ? hostname.slice(4) : hostname];
    }

    static init() {
        Logger.info(`Initialize router`);
        proxy = httpProxy.createProxyServer({});
        proxy.on('error', error => Logger.error('Proxy error: ' + error.message));
    }

    static route(req, res) {

        let matchingRoute,
            reqHostname = /^www\./.test(req.hostname) ? req.hostname.slice(4) : req.hostname;

        for (let i = 0; i < config.map.length && !matchingRoute; i++) {

            let route = config.map[i];

            for (let j = 0; j < route.hosts.length; j++) {

                let splitHost = route.hosts[j].split('/'),
                    hostname = splitHost[0],
                    match = hostname === reqHostname;

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
            Logger.info(`->${matchingRoute.service}: ${req.method} ${request}`);
            proxy.web(req, res, {target: `http://${matchingRoute.service}:${matchingRoute.port}`});
        } else {
            Logger.info(`No route found: ${req.method} ${request}`);
            res.status(404).send('Not found');
        }
    }
};