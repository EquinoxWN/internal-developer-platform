import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createApp } from '../src/server.js';

let server;
let base;
before(async () => {
  server = createApp({});
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

test('liveness probe answers ok', async () => {
  const res = await fetch(`${base}/healthz`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok' });
});

test('root names the service', async () => {
  assert.deepEqual(await (await fetch(`${base}/`)).json(), { service: '${{ values.name }}' });
});

test('unknown paths and methods are refused', async () => {
  assert.equal((await fetch(`${base}/nope`)).status, 404);
  assert.equal((await fetch(`${base}/`, { method: 'POST' })).status, 405);
});
{%- if values.database %}

test('readiness depends on the database setting', async () => {
  assert.equal((await fetch(`${base}/readyz`)).status, 503);
  const configured = createApp({ databaseUrl: 'postgres://db/app' });
  await new Promise((resolve) => configured.listen(0, '127.0.0.1', resolve));
  const res = await fetch(`http://127.0.0.1:${configured.address().port}/readyz`);
  configured.close();
  assert.equal(res.status, 200);
});
{%- endif %}
