const httpProxy = require('http-proxy');

const { Logger } = require('./logger');
const { getHostConfig, getTarget } = require('./routing-helpers');

const FORBIDDEN = 403;
const NOT_FOUND = 404;

module.exports.httpRouter = config => {
  const { hosts } = config;
  const proxy = httpProxy.createProxyServer({});

  proxy.on('error', error => Logger.error(`Proxy error: ${error.message}`));

  return (req, res) => {
    const { hostname, method, path, protocol } = req;
    const hostConfig = getHostConfig(hosts, hostname);

    if (!hostConfig) {
      return res.status(FORBIDDEN).end('Unknown host');
    }

    if (protocol !== 'https' && hostConfig.https && hostConfig.forceHttps) {
      const newUrl = `https://${hostname}${url}`;
      Logger.info(hostname + ' is a HTTPS only domain, use HTTPS instead of HTTP');
      Logger.info(`Redirect from ${protocol}://${hostname}${url} to ${newUrl}`);
      return res.redirect(newUrl);
    }

    const target = getTarget(hostConfig, protocol, path);
    const request = `${protocol}://${hostname}${path}`;

    if (target) {
      Logger.info(`${method} ${request} -> ${target}${path}`);
      proxy.web(req, res, { target });
    } else {
      Logger.info(`No HTTP route found: ${method} ${request}`);
      res.status(NOT_FOUND).end();
    }
  };
};
