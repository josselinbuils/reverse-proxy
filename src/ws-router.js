const WebSocket = require('ws');

const { Logger } = require('./logger');
const { getHostConfig, getTarget } = require('./routing-helpers');

const FORBIDDEN = 403;
const NOT_FOUND = 404;

module.exports.wsRouter = config => wsClient => {
  const { hosts } = config;
  const { hostname, path, protocol } = getClientInfo(wsClient);
  const hostConfig = getHostConfig(hosts, hostname);

  if (!hostConfig) {
    return client.close(FORBIDDEN, 'Unknown host');
  }

  const target = getTarget(hostConfig, protocol, path);
  const request = `${protocol}://${hostname}${path}`;

  if (target) {
    Logger.info(`${request} -> ${target}`);

    const wsProxy = new WebSocket(target);

    wsProxy.on('open', () => {
      wsClient.on('message', wsProxy.send);
      wsProxy.on('message', wsClient.send);
    });

    wsClient.on('close', wsProxy.close);
    wsProxy.on('close', wsClient.close);

  } else {
    Logger.info(`No WebSocket route found: ${request}`);
    return wsClient.close(NOT_FOUND);
  }
};

function getClientInfo(wsClient) {
  const match = wsClient.url.match(/^(.+):\/\/(www\.)?([^/]+)(:[^/]+)?(.*)$/);

  if (match === null) {
    throw new Error('Unable to retrieve WebSocket client info');
  }

  return {
    hostname: match[3],
    path: match[5],
    protocol: match[1],
  };
}
