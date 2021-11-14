import { IncomingMessage } from 'http';
import WebSocket from 'ws';
import { Logger } from './Logger';
import { Redirect } from './Redirect';
import { getRedirects, getTarget } from './utils';

export function wsRouter(hosts: {
  [host: string]: Redirect[];
}): (wsClient: WebSocket, req: IncomingMessage) => void {
  return (wsClient: WebSocket, req: IncomingMessage) => {
    const { headers, url } = req;
    const { host } = headers;

    const redirects = getRedirects(hosts, host);

    if (!redirects) {
      wsClient.send('Unknown host');
      return wsClient.close();
    }

    const target = getTarget(redirects, 'wss', url);
    const request = `wss://${host}${url}`;

    if (target) {
      Logger.info(`${request} -> ${target}${url}`);

      const wsProxy = new WebSocket(`${target}${url}`);

      wsProxy.on('open', () => {
        wsClient.on('message', (data) => wsProxy.send(data));
        wsProxy.on('message', (data) => wsClient.send(data));
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
