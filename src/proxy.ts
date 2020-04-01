import compression from 'compression';
import express from 'express';
import greenlockExpress from 'greenlock-express';
import helmet from 'helmet';
import { validate } from 'jsonschema';
import leStoreFs from 'le-store-fs';
import path from 'path';
import { Server as WsServer } from 'ws';
import configSchema from './config.schema.json';
import {
  ENV_DEV,
  FORBIDDEN,
  HTTPS_PORT,
  HTTP_PORT,
  LOCALHOST,
} from './constants';
import { httpRouter } from './httpRouter';
import { Logger } from './Logger';
import { wsRouter } from './wsRouter';

const ENV = process.env.NODE_ENV || ENV_DEV;

const rawConfig = require(path.join(process.cwd(), 'config.json'));
const hosts = validate(rawConfig, configSchema, { throwError: true }).instance;

Logger.info('Starts ReverseProxy');

const app = express().use(helmet()).use(compression()).use(httpRouter(hosts));

greenlockExpress
  .init({
    cluster: false,
    configDir: './greenlock.d',
    maintainerEmail: 'josselin.buils@gmail.com',
    packageRoot: process.cwd(),
    staging: ENV === ENV_DEV,
    store: leStoreFs.create({
      configDir: '/letsencrypt/etc',
      privkeyPath: ':configDir/live/:hostname/privkey.pem',
      fullchainPath: ':configDir/live/:hostname/fullchain.pem',
      certPath: ':configDir/live/:hostname/cert.pem',
      chainPath: ':configDir/live/:hostname/chain.pem',
      workDir: '/letsencrypt/var/lib',
      logsDir: '/letsencrypt/var/log',
      webrootPath: '/letsencrypt/srv/www/:hostname/.well-known/acme-challenge',
    }),
  })
  .ready((servers: any) => {
    const httpServer = servers
      .httpServer(app)
      .listen(HTTP_PORT, () =>
        Logger.info(
          `ReverseProxy is listening on port ${HTTP_PORT} for HTTP protocol`
        )
      );

    const httpsServer = servers
      .httpsServer(null, app)
      .listen(HTTPS_PORT, () =>
        Logger.info(
          `ReverseProxy is listening on port ${HTTPS_PORT} for HTTPS protocol`
        )
      );

    // tslint:disable-next-line:no-unused-expression
    new WsServer({
      server: httpServer,
      verifyClient: ({ req, origin }, callback) => {
        // Allow request from localhost for dev purpose
        if (ENV === ENV_DEV && req.headers.host.indexOf(LOCALHOST) === 0) {
          return callback(true);
        }

        Logger.error(
          `Non-secure websocket connection received from ${origin}, reject it`
        );
        callback(false, FORBIDDEN);
      },
    });

    new WsServer({ server: httpsServer }).on('connection', wsRouter(hosts));
  });
