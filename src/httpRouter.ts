import { Agent } from 'node:http';
import { type Request, type Response } from 'express';
import httpProxy from 'http-proxy';
import { Logger } from './Logger';
import { type Redirect } from './Redirect';
import {
  ENV_DEV,
  ENV_PROD,
  FORBIDDEN,
  INTERNAL_ERROR,
  KEEP_ALIVE_MS,
  NOT_FOUND,
} from './constants';
import { getRedirects } from './utils/getRedirects';
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
      const redirects = getRedirects(hosts, hostname);

      if (!redirects) {
        return res.status(FORBIDDEN).end('Unknown host');
      }

      // Allows HTTP only in dev environment
      if (protocol !== 'https' && ENV === ENV_PROD) {
        const newUrl = `https://${hostname}${url}`;
        Logger.info(
          `${hostname} is a HTTPS only domain, use HTTPS instead of HTTP`,
        );
        Logger.info(
          `Redirect from ${protocol}://${hostname}${url} to ${newUrl}`,
        );
        return res.redirect(newUrl);
      }

      const target = getTarget(redirects, protocol, url);
      const request = `${protocol}://${hostname}${url}`;

      if (target) {
        Logger.info(`${method} ${request} -> ${target}${url}`);
        proxy.web(req, res, { target });
      } else {
        Logger.info(`No HTTP route found: ${method} ${request}`);
        res.status(NOT_FOUND).end();
      }
    } catch (error) {
      Logger.error(error.stack);
      res.status(INTERNAL_ERROR);
    }
  };
}
