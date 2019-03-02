module.exports = {
  getHostConfig,
  getTarget,
  isHTTPS,
};

function getHostConfig(hosts, hostname) {
  return hosts[/^www\./.test(hostname) ? hostname.slice(4) : hostname];
}

function getTarget(hostConfig, protocol, path) {
  const redirect = hostConfig.redirects
    .find(redirect => path.toLowerCase().indexOf(redirect.path.toLowerCase()) === 0);

  if (redirect === undefined) {
    return undefined;
  }

  const { service, httpPort, wsPort } = redirect;

  switch (protocol.toLowerCase()) {
    case 'https':
      if (httpPort !== undefined) {
        return `http://${service}:${httpPort}`;
      }
      break;

    case 'wss':
      if (wsPort !== undefined) {
        return `ws://${service}:${wsPort}`;
      }
      break;

    default:
      throw new Error('Invalid protocol');
  }
}

function isHTTPS(hosts, hostname) {
  const hostConfig = getHostConfig(hosts, hostname);
  return hostConfig && hostConfig.https;
}
