import path from 'node:path';
import compression from 'compression';
import express from 'express';
import greenlockExpress, { type Options } from 'greenlock-express';
import helmet from 'helmet';
import { validate } from 'jsonschema';
import leStoreFs from 'le-store-fs';
import { Server as WsServer } from 'ws';
import { Logger } from './Logger';
import configSchema from './config.schema.json';
import {
  ENV_DEV,
  FORBIDDEN,
  HTTPS_PORT,
  HTTP_PORT,
  LOCALHOST,
} from './constants';
import { httpRouter } from './httpRouter';
import { wsRouter } from './wsRouter';

const ENV = process.env.NODE_ENV || ENV_DEV;

const rawConfig = require(path.join(process.cwd(), 'config.json'));
const hosts = validate(rawConfig, configSchema, { throwError: true }).instance;

Logger.info('Starts ReverseProxy');

const app = express()
  .use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      xFrameOptions: false,
    }),
  )
  .use(compression())
  .use(httpRouter(hosts));

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
  } as Options)
  .ready((servers: any) => {
    const httpServer = servers
      .httpServer(app)
      .listen(HTTP_PORT, () =>
        Logger.info(
          `ReverseProxy is listening on port ${HTTP_PORT} for HTTP protocol.`,
        ),
      );

    const httpsServer = servers
      .httpsServer(null, app)
      .listen(HTTPS_PORT, () =>
        Logger.info(
          `ReverseProxy is listening on port ${HTTPS_PORT} for HTTPS protocol.`,
        ),
      );

    // eslint-disable-next-line no-new
    new WsServer({
      server: httpServer,
      verifyClient: ({ req, origin }, callback) => {
        // Allow request from localhost for dev purpose
        if (ENV === ENV_DEV && req.headers.host === LOCALHOST) {
          return callback(true);
        }

        Logger.error(
          `Non-secure websocket connection received from ${origin}, reject it.`,
        );
        callback(false, FORBIDDEN);
      },
    });

    new WsServer({ server: httpsServer }).on('connection', wsRouter(hosts));
  });
