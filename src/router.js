'use strict';

const httpProxy = require('http-proxy');

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

    static redirect(req, res) {

        let url = decodeURIComponent(req.params.url)

        var urlRegex = /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})).?)(?::\d{2,5})?(?:[/?#]\S*)?$/i;

        if (!urlRegex.test(url)) {
            Logger.error('Invalid url: ' + url);
            return res.status(400).end('Invalid url');
        }

        Logger.info('GET ' + url);

        proxy.web(req, res, {
            changeOrigin: true,
            ignorePath: true,
            target: url
        });
    }

    static route(req, res) {

        let redirects = req.hostConfig.redirects,
            redirect;

        for (let i = 0; i < redirects.length; i++) {

            let path = redirects[i].path,
                pathRegex = '^' + path.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");

            if (path === '*' || new RegExp(pathRegex).test(req.url)) {
                redirect = redirects[i];
                break;
            }
        }

        let request = req.protocol + '://' + req.hostname + req.path;

        if (redirect) {
            Logger.info(`->${redirect.service}: ${req.method} ${request}`);
            proxy.web(req, res, {target: `http://${redirect.service}:${redirect.port}`});
        } else {
            Logger.info(`No route found: ${req.method} ${request}`);
            res.status(404).send('Not found');
        }
    }
};