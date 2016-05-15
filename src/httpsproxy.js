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
            configDir: '/letsencrypt',
            approveRegistration: function (hostname, cb) {
                if (HTTPSProxy.isHTTPSDomain(hostname)) {
                    Logger.info(`Approve registration for domain ${hostname}`);

                    cb(null, {
                        domains: [hostname],
                        email: 'josselin.buils@gmail.com',
                        agreeTos: true
                    });

                } else {
                    Logger.info(`${hostname} is not a HTTPS domain`);
                }
            },
            httpsOptions: {
                SNICallback: () => console.log('cmoi')
            },
            onRequest: (req, res) => {
                console.log('bou');
                res.send('kikou');
            }
        }).listen(null, null, function () {
            var server = this;
            var protocol = ('requestCert' in server) ? 'https' : 'http';
            console.log("Listening at " + protocol + '://localhost:' + this.address().port);
        });

        // let app = express();
        //
        // app.use(helmet());
        //
        // app.use((req, res, next) => {
        //
        //     console.log('boy');
        //
        //     if (!/^www\./.test(req.hostname) && req.hostname.split('.').length === 2) {
        //         Logger.info(`Add www subdomain to ${req.hostname}`);
        //         return res.redirect('https://www.' + req.hostname + req.url);
        //     }
        //
        //     if (!HTTPSProxy.isHTTPSDomain(req.hostname)) {
        //         Logger.info(`${req.hostname} is not a HTTPS domain, use HTTP instead`);
        //         return res.redirect('http://' + req.hostname + req.url);
        //     }
        //
        //     next();
        // });
        //
        // app.use(LEX.createAcmeResponder(lex, Router.route));
        //
        // https.createServer(lex.httpsOptions, app).listen(443);

        Logger.info('ReverseProxy is listening on port 443 for HTTPS protocol');
    }
};