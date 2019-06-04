module.exports = {
  getRedirects,
  getTarget
};

function getRedirects(hosts, hostname) {
  return hosts[/^www\./.test(hostname) ? hostname.slice(4) : hostname];
}

function getTarget(redirects, protocol, path) {
  const redirect = redirects.find(
    redirect => path.toLowerCase().indexOf(redirect.path.toLowerCase()) === 0
  );

  if (redirect === undefined) {
    return undefined;
  }

  const { service, httpPort, wsPort } = redirect;

  switch (protocol.toLowerCase()) {
    case 'http':
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
