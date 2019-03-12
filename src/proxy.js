const compression = require('compression');
const express = require('express');
const contentLength = require('express-content-length-validator');
const LEX = require('greenlock-express');
const helmet = require('helmet');
const http = require('http');
const https = require('https');
const { validate } = require('jsonschema');
const leChallengeFs = require('le-challenge-fs');
const leStoreCertBot = require('le-store-certbot');
const WsServer = require('ws').Server;

const rawConfig = require('../config');
const configSchema = require('../config.schema');

const { ENV_DEV, FORBIDDEN, HTTP_PORT, HTTPS_PORT, LOCALHOST, MAX_CONTENT_LENGTH } = require('./constants');
const { httpRouter } = require('./http-router');
const { Logger } = require('./logger');
const { wsRouter } = require('./ws-router');

const ENV = process.env.NODE_ENV || ENV_DEV;
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
  .use(contentLength.validateMax({ max: MAX_CONTENT_LENGTH }))
  .use(compression())
  .use(httpRouter(hosts));

const httpServer = http
  .createServer(lex.middleware(app))
  .listen(HTTP_PORT, () => Logger.info(`ReverseProxy is listening on port ${HTTP_PORT} for HTTP protocol`));

const httpsServer = https
  .createServer(lex.httpsOptions, lex.middleware(app))
  .listen(HTTPS_PORT, () => Logger.info(`ReverseProxy is listening on port ${HTTPS_PORT} for HTTPS protocol`));

new WsServer({
  server: httpServer,
  verifyClient: ({ req, origin }, callback) => {

    // Allow request from localhost for dev purpose
    if (ENV === ENV_DEV && req.headers.host.indexOf(LOCALHOST) === 0) {
      return callback(true);
    }

    Logger.error(`Non-secure websocket connection received from ${origin}, reject it`);
    callback(false, FORBIDDEN);
  },
});

new WsServer({ server: httpsServer }).on('connection', wsRouter(hosts));
