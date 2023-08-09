export interface InternalRedirect {
  httpPort?: number;
  path: string;
  service: string;
  wsPort?: number;
}

export type ExternalRedirect = string;

export function getTarget(
  hostConfig: ExternalRedirect | InternalRedirect[],
  protocol: string,
  path: string,
): { external: boolean; host: string } | undefined {
  if (typeof hostConfig === 'string') {
    return {
      external: true,
      host: hostConfig,
    };
  }

  const redirect = hostConfig.find(
    (r) =>
      r.path === '*' || path.toLowerCase().startsWith(r.path.toLowerCase()),
  );

  if (redirect === undefined) {
    return undefined;
  }

  const { service, httpPort, wsPort } = redirect;

  switch (protocol.toLowerCase()) {
    case 'http':
    case 'https':
      if (httpPort !== undefined) {
        return {
          external: false,
          host: `http://${service}:${httpPort}`,
        };
      }
      break;

    case 'wss':
      if (wsPort !== undefined) {
        return {
          external: false,
          host: `ws://${service}:${wsPort}`,
        };
      }
      break;

    default:
      throw new Error('Invalid protocol');
  }
}
