import type { IncomingMessage, ServerResponse } from 'node:http';
import accountsArchive from '../api-handlers/v1/accounts/archive';
import accountsList from '../api-handlers/v1/accounts/index';
import accountDetails from '../api-handlers/v1/accounts/[key]';
import resetPassword from '../api-handlers/v1/accounts/[key]/reset-password';
import activity from '../api-handlers/v1/activity';
import firstSignin from '../api-handlers/v1/auth/first-signin';
import login from '../api-handlers/v1/auth/login';
import logout from '../api-handlers/v1/auth/logout';
import currentUser from '../api-handlers/v1/auth/me';
import setPassword from '../api-handlers/v1/auth/set-password';
import barangays from '../api-handlers/v1/barangays/index';
import health from '../api-handlers/v1/health';
import prelistings from '../api-handlers/v1/prelistings/index';
import records from '../api-handlers/v1/records/[dataset]';
import archiveRecords from '../api-handlers/v1/records/[dataset]/archive';
import importRecords from '../api-handlers/v1/records/[dataset]/import';
import undoImport from '../api-handlers/v1/records/[dataset]/undo-import';

interface RoutedRequest extends IncomingMessage {
  query?: Record<string, string | string[]>;
  body?: unknown;
}

type RouteHandler = (req: RoutedRequest, res: ServerResponse) => Promise<void>;

const routeEntries: Array<{ path: string; handler: RouteHandler }> = [
  { path: '/api/v1/activity', handler: activity },
  { path: '/api/v1/health', handler: health },
  { path: '/api/v1/accounts/archive', handler: accountsArchive },
  { path: '/api/v1/accounts', handler: accountsList },
  { path: '/api/v1/accounts/[key]', handler: accountDetails },
  { path: '/api/v1/accounts/[key]/reset-password', handler: resetPassword },
  { path: '/api/v1/auth/first-signin', handler: firstSignin },
  { path: '/api/v1/auth/login', handler: login },
  { path: '/api/v1/auth/logout', handler: logout },
  { path: '/api/v1/auth/me', handler: currentUser },
  { path: '/api/v1/auth/set-password', handler: setPassword },
  { path: '/api/v1/barangays', handler: barangays },
  { path: '/api/v1/prelistings', handler: prelistings },
  { path: '/api/v1/records/[dataset]', handler: records },
  { path: '/api/v1/records/[dataset]/archive', handler: archiveRecords },
  { path: '/api/v1/records/[dataset]/import', handler: importRecords },
  { path: '/api/v1/records/[dataset]/undo-import', handler: undoImport },
];

const routes = routeEntries.map((entry) => {
  const names: string[] = [];
  const expression = `^${entry.path.replace(/\[([^\]]+)\]/g, (_match, name: string) => {
    names.push(name);
    return '([^/]+)';
  })}$`;
  return { ...entry, names, expression: new RegExp(expression) };
}).sort((a, b) => a.names.length - b.names.length);

export async function dispatchApi(req: RoutedRequest, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost');
  for (const route of routes) {
    const match = route.expression.exec(url.pathname);
    if (!match) continue;
    const query = { ...(req.query ?? {}) };
    route.names.forEach((name, index) => {
      query[name] = decodeURIComponent(match[index + 1]);
    });
    req.query = query;
    return route.handler(req, res);
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  res.end('{"error":{"code":"NOT_FOUND","message":"Not found."}}');
}
