const express = require('express');
const helmet = require('helmet');
const http = require('http');
const https = require('spdy');
const leChallengeFs = require('le-challenge-fs');
const leStoreCertbot = require('le-store-certbot')
const LEX = require('greenlock-express');
const redirectHTTPS = require('redirect-https');

const Logger = require('./logger');
const Router = require('./router');

Logger.info('Start ReverseProxy');

let lex = LEX.create({
    server: 'https://acme-v01.api.letsencrypt.org/directory',
    challenges: {
        'http-01': leChallengeFs.create({}),
        'tls-sni-01': leChallengeFs.create({})
    },
    store: leStoreCertbot.create({
        configDir: '/letsencrypt/etc',
        privkeyPath: ':configDir/live/:hostname/privkey.pem',
        fullchainPath: ':configDir/live/:hostname/fullchain.pem',
        certPath: ':configDir/live/:hostname/cert.pem',
        chainPath: ':configDir/live/:hostname/chain.pem',
        workDir: '/letsencrypt/var/lib',
        logsDir: '/letsencrypt/var/log',
        webrootPath: '/letsencrypt/srv/www/:hostname/.well-known/acme-challenge'
    }),
    approveDomains: (opts, certs, cb) => {

        if (certs) {
            opts.domains = certs.altnames;
        } else {
            const hostname = opts.domains[0];
            const hostConfig = Router.getHostConfig(hostname);
            const isHTTPS = hostConfig && hostConfig.https;

            opts.domains = [hostname];
            opts.email = 'josselin.buils@gmail.com';
            opts.agreeTos = isHTTPS;

            Logger.info(`Approve registration for domain ${hostname}: ${isHTTPS}`);
        }

        cb(null, {
            options: opts,
            certs: certs
        });
    }
});

let app = express();

Router.init();

app.use(helmet());
app.use(Router.checkHost);
app.get('/url/:url', Router.redirect);
app.use(Router.checkUrl);
app.use(Router.route);

http.createServer(lex.middleware(redirectHTTPS())).listen(80, function () {
    Logger.info(`ReverseProxy is listening on port ${this.address().port} for HTTP protocol`);
});

https.createServer(lex.httpsOptions, lex.middleware(app)).listen(443, function () {
    Logger.info(`ReverseProxy is listening on port ${this.address().port} for HTTPS protocol`);
});