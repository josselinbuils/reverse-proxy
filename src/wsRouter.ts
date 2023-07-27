import { type IncomingMessage } from 'http';
import WebSocket from 'ws';
import { Logger } from './Logger';
import {
  type ExternalRedirect,
  type InternalRedirect,
  getTarget,
} from './redirect';

export function wsRouter(hosts: {
  [host: string]: ExternalRedirect | InternalRedirect[];
}): (wsClient: WebSocket, req: IncomingMessage) => void {
  return (wsClient: WebSocket, req: IncomingMessage) => {
    const { headers, url } = req;
    const { host } = headers;

    const redirects = hosts[host];

    // External redirects are managed only with HTTPS protocol
    if (!redirects || !Array.isArray(redirects)) {
      wsClient.send('Unknown host');
      return wsClient.close();
    }

    const target = getTarget(redirects, 'wss', url);
    const request = `wss://${host}${url}`;

    if (target) {
      Logger.info(`${request} -> ${target.host}${url}`);

      const wsProxy = new WebSocket(`${target.host}${url}`);

      wsProxy.on('open', () => {
        wsClient.on('message', (data, isBinary) =>
          wsProxy.send(isBinary ? data : data.toString()),
        );
        wsProxy.on('message', (data, isBinary) =>
          wsClient.send(isBinary ? data : data.toString()),
        );
      });

      wsClient.on('close', () => wsProxy.close());
      wsProxy.on('close', () => wsClient.close());
    } else {
      Logger.info(`No WebSocket route found: ${request}`);
      wsClient.send('Not found');
      return wsClient.close();
    }
  };
}
