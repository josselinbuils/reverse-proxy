import { Agent } from 'node:http';
import { type Request, type Response } from 'express';
import httpProxy from 'http-proxy';
import { Logger } from './Logger';
import { type Redirect } from './Redirect';
import {
  ENV_DEV,
  ENV_PROD,
  FORBIDDEN,
  HTTP_STATUS_INTERNAL_ERROR,
  KEEP_ALIVE_MS,
  HTTP_STATUS_NOT_FOUND,
  HTTP_STATUS_MOVED_PERMANENTLY,
} from './constants';
import { getTarget } from './utils/getTarget';

const ENV = process.env.NODE_ENV || ENV_DEV;

export function httpRouter(hosts: {
  [host: string]: Redirect[];
}): (req: Request, res: Response) => void {
  const proxy = httpProxy.createProxyServer({
    agent: new Agent({ keepAlive: true, keepAliveMsecs: KEEP_ALIVE_MS }),
  });

  proxy.on('error', (error: Error) =>
    Logger.error(`Proxy error: ${error.message}`),
  );

  return (req: Request, res: Response) => {
    try {
      const { hostname, method, protocol, url } = req;

      if (
        (protocol !== 'https' && ENV === ENV_PROD) ||
        hostname.startsWith('www.')
      ) {
        const newUrl = `https://${hostname.replace(/^www\./, '')}${url}`;
        Logger.info(
          `Redirect from ${protocol}://${hostname}${url} to ${newUrl}.`,
        );
        return res.redirect(HTTP_STATUS_MOVED_PERMANENTLY, newUrl);
      }

      const redirects = hosts[hostname];

      if (!redirects) {
        return res.status(FORBIDDEN).send('Unknown host');
      }

      const target = getTarget(redirects, protocol, url);
      const request = `${protocol}://${hostname}${url}`;

      if (target) {
        Logger.info(`${method} ${request} -> ${target}${url}`);
        proxy.web(req, res, { target });
      } else {
        Logger.info(`No target found: ${method} ${request}.`);
        res.sendStatus(HTTP_STATUS_NOT_FOUND);
      }
    } catch (error) {
      Logger.error(error.stack);
      res.sendStatus(HTTP_STATUS_INTERNAL_ERROR);
    }
  };
}
