const WebSocket = require('ws');

const { Logger } = require('./logger');
const { getHostConfig, getTarget } = require('./routing-helpers');

module.exports.wsRouter = hosts => (wsClient, req) => {
  const { connection, url } = req;

  // Keep same names than in http router to ensure coherence
  const hostname = connection.servername;
  const path = url;

  const hostConfig = getHostConfig(hosts, hostname);

  if (!hostConfig) {
    wsClient.send('Unknown host');
    return wsClient.close();
  }

  const target = getTarget(hostConfig, 'wss', path);
  const request = `wss://${hostname}${path}`;

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
