const WebSocket = require("ws");

const { Logger } = require("./logger");
const { getRedirects, getTarget } = require("./routing-helpers");

module.exports.wsRouter = hosts => (wsClient, req) => {
  const { headers, url } = req;
  const { host } = headers;

  const redirects = getRedirects(hosts, host);

  if (!redirects) {
    wsClient.send("Unknown host");
    return wsClient.close();
  }

  const target = getTarget(redirects, "wss", url);
  const request = `wss://${host}${url}`;

  if (target) {
    Logger.info(`${request} -> ${target}`);

    const wsProxy = new WebSocket(target);

    wsProxy.on("open", () => {
      wsClient.on("message", data => wsProxy.send(data));
      wsProxy.on("message", data => wsClient.send(data));
    });

    wsClient.on("close", () => wsProxy.close());
    wsProxy.on("close", () => wsClient.close());
  } else {
    Logger.info(`No WebSocket route found: ${request}`);
    wsClient.send("Not found");
    return wsClient.close();
  }
};
