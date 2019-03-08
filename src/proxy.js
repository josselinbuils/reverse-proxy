const express = require('express');
const LEX = require('greenlock-express');
const helmet = require('helmet');
const http = require('http');
const https = require('https');
const { validate } = require('jsonschema');
const leChallengeFs = require('le-challenge-fs');
const leStoreCertBot = require('le-store-certbot');
const WsServer = require('ws').Server;

// noinspection JSFileReferences
const rawConfig = require('../config');
const configSchema = require('../config.schema');

const { httpRouter } = require('./http-router');
const { Logger } = require('./logger');
const { wsRouter } = require('./ws-router');

const HTTP_PORT = 80;
const HTTPS_PORT = 443;
const IM_A_TEAPOT = 418;

const hosts = validate(rawConfig, configSchema, { throwError: true }).instance;

Logger.info('Starts ReverseProxy');

const lex = LEX.create({
  server: 'https://acme-v02.api.letsencrypt.org/directory',
  version: 'draft-11',
  challenges: {
    'http-01': leChallengeFs.create({}),
    'tls-sni-01': leChallengeFs.create({}),
  },
  store: leStoreCertBot.create({
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
      options.agreeTos = true;

      Logger.info(`Approve registration for domain ${hostname}: ${options.agreeTos}`);
    }
    cb(null, { options, certs });
  },
});

const app = express()
  .use(helmet())
  .use(httpRouter(hosts));

http
  .createServer(lex.middleware(app))
  .listen(HTTP_PORT, () => Logger.info(`ReverseProxy is listening on port ${HTTP_PORT} for HTTP protocol`));

const server = https
  .createServer(lex.httpsOptions, lex.middleware(app))
  .listen(HTTPS_PORT, () => Logger.info(`ReverseProxy is listening on port ${HTTPS_PORT} for HTTPS protocol`));

new WsServer({
  server,
  verifyClient: ({ origin, secure }, callback) => {
    if (!secure) {
      Logger.error(`Non-secure websocket connection received from ${origin}, reject it`);
    }
    callback(secure, IM_A_TEAPOT);
  },
}).on('connection', wsRouter(hosts));
