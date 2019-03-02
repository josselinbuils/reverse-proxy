const express = require('express');
const helmet = require('helmet');
const http = require('http');
const https = require('https');
const leChallengeFs = require('le-challenge-fs');
const leStoreCertbot = require('le-store-certbot');
const LEX = require('greenlock-express');

const Logger = require('./logger');
const Router = require('./router');

Logger.info('Starts ReverseProxy');

const lex = LEX.create({
  server: 'https://acme-v02.api.letsencrypt.org/directory',
  version: 'draft-11',
  challenges: {
    'http-01': leChallengeFs.create({}),
    'tls-sni-01': leChallengeFs.create({}),
  },
  store: leStoreCertbot.create({
    configDir: '/letsencrypt/etc',
    privkeyPath: ':configDir/live/:hostname/privkey.pem',
    fullchainPath: ':configDir/live/:hostname/fullchain.pem',
    certPath: ':configDir/live/:hostname/cert.pem',
    chainPath: ':configDir/live/:hostname/chain.pem',
    workDir: '/letsencrypt/var/lib',
    logsDir: '/letsencrypt/var/log',
    webrootPath: '/letsencrypt/srv/www/:hostname/.well-known/acme-challenge',
  }),
  approveDomains: (options, certs, cb) => {
    if (certs) {
      options.domains = certs.altnames;
    } else {
      const hostname = options.domains[0];

      options.domains = [hostname];
      options.email = 'josselin.buils@gmail.com';
      options.agreeTos = Router.isHTTPS(hostname);

      Logger.info(`Approve registration for domain ${hostname}: ${options.agreeTos}`);
    }
    cb(null, { options, certs });
  },
});

const app = express();

Router.init();

app.use(helmet());
app.use(Router.checkHost);
app.use(Router.redirectHTTPS);
app.use(Router.route);

http
  .createServer(lex.middleware(app))
  .listen(80, function () {
    Logger.info(`ReverseProxy is listening on port ${this.address().port} for HTTP protocol`);
  });

https
  .createServer(lex.httpsOptions, lex.middleware(app))
  .listen(443, function () {
    Logger.info(`ReverseProxy is listening on port ${this.address().port} for HTTPS protocol`);
  });
