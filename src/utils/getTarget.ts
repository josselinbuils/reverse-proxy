import { Redirect } from '../Redirect';

export function getTarget(
  redirects: Redirect[],
  protocol: string,
  path: string
): string {
  const redirect = redirects.find(
    (r) => path.toLowerCase().indexOf(r.path.toLowerCase()) === 0
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
