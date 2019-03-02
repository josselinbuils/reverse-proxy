const WebSocket = require('ws');

const { Logger } = require('./logger');
const { getHostConfig, getTarget } = require('./routing-helpers');

const FORBIDDEN = 403;
const NOT_FOUND = 404;

module.exports.wsRouter = config => (wsClient, req) => {
  const { hosts } = config;
  const { hostname, path, protocol } = req;
  console.log(req);
  console.log('\n\n');
  console.log(hostname, path, protocol);
  const hostConfig = getHostConfig(hosts, hostname);

  if (!hostConfig) {
    wsClient.send('Unknown host');
    return wsClient.close();
  }

  const target = getTarget(hostConfig, protocol, path);
  const request = `${protocol}://${hostname}${path}`;

  if (target) {
    Logger.info(`${request} -> ${target}`);

    const wsProxy = new WebSocket(target);

    wsProxy.on('open', () => {
      wsClient.on('message', data => wsProxy.send(data));
      wsProxy.on('message', data => wsClient.send(data));
    });

    wsClient.on('close', () => wsProxy.close());
    wsProxy.on('close', () => wsClient.close());

  } else {
    Logger.info(`No WebSocket route found: ${request}`);
    wsClient.send('Not found');
    return wsClient.close();
  }
};
