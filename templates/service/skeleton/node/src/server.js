import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';

/** HTTP handler for the service; options come from the environment in production. */
export function createApp({ databaseUrl } = {}) {
  return createServer((req, res) => {
    const reply = (status, body) => {
      res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(body));
    };
    if (req.method !== 'GET') return reply(405, { error: 'method not allowed' });
    if (req.url === '/healthz') return reply(200, { status: 'ok' });
{%- if values.database %}
    if (req.url === '/readyz') {
      return databaseUrl ? reply(200, { database: 'configured' }) : reply(503, { database: 'DATABASE_URL is not set' });
    }
{%- endif %}
    if (req.url === '/') return reply(200, { service: '${{ values.name }}' });
    return reply(404, { error: 'not found' });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 8080);
  createApp({ databaseUrl: process.env.DATABASE_URL }).listen(port, () => {
    console.log(`${{ values.name }} listening on ${port}`);
  });
}
