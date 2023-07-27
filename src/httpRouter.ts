import { Agent } from 'node:http';
import { type Request, type Response } from 'express';
import httpProxy from 'http-proxy';
import { Logger } from './Logger';
import {
  ENV_DEV,
  ENV_PROD,
  FORBIDDEN,
  HTTP_STATUS_INTERNAL_ERROR,
  KEEP_ALIVE_MS,
  HTTP_STATUS_NOT_FOUND,
  HTTP_STATUS_MOVED_PERMANENTLY,
} from './constants';
import {
  type ExternalRedirect,
  type InternalRedirect,
  getTarget,
} from './redirect';

const ENV = process.env.NODE_ENV || ENV_DEV;

export function httpRouter(hosts: {
  [host: string]: ExternalRedirect | InternalRedirect[];
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

      if (protocol !== 'https' && ENV === ENV_PROD) {
        redirect(req, res, `https://${hostname}${url}`);
        return;
      }

      const redirects = hosts[hostname];

      if (!redirects) {
        res.status(FORBIDDEN).send('Unknown host');
        return;
      }

      const target = getTarget(redirects, protocol, url);
      const request = `${protocol}://${hostname}${url}`;

      if (target) {
        if (target.external) {
          redirect(req, res, `${protocol}://${target.host}${url}`);
        } else {
          Logger.info(`${method} ${request} -> ${target.host}${url}`);
          proxy.web(req, res, { target: target.host });
        }
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

function redirect(req: Request, res: Response, newUrl: string) {
  const { hostname, protocol, url } = req;
  Logger.info(`Redirect from ${protocol}://${hostname}${url} to ${newUrl}.`);
  return res.redirect(HTTP_STATUS_MOVED_PERMANENTLY, newUrl);
}
