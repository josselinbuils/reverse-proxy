import { type Redirect } from '../Redirect';

export function getRedirects(
  hosts: { [host: string]: Redirect[] },
  hostname: string,
): Redirect[] {
  return hosts[/^www\./.test(hostname) ? hostname.slice(4) : hostname];
}
