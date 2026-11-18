// Spec 016: a small round-robin load balancer for measuring AC06 on one
// machine, with two instances of the API behind it. Not for production: there
// the balancer is the hosting's (nginx, a cloud load balancer).
//   node backend/test/load/balanceador.mjs 3100 3101 3102
// First port: where it listens. The rest: the API instances.
// It forwards X-Forwarded-For so each instance sees the client address.
// GET /__balanceador answers how many requests went to each instance.
import { request as forward, createServer } from 'node:http';

const [listen, ...targets] = process.argv.slice(2).map(Number);
if (!listen || targets.length === 0) throw new Error('Uso: balanceador.mjs <puerto> <instancia> [instancia...]');
const counts = new Map(targets.map((port) => [port, 0]));
let next = 0;

const server = createServer((incoming, outgoing) => {
  if (incoming.url === '/__balanceador') {
    outgoing.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(Object.fromEntries(counts)));
    return;
  }
  const port = targets[next];
  next = (next + 1) % targets.length;
  counts.set(port, counts.get(port) + 1);
  const headers = { ...incoming.headers, 'x-forwarded-for': incoming.socket.remoteAddress ?? '' };
  const upstream = forward({ headers, host: '127.0.0.1', method: incoming.method, path: incoming.url, port }, (response) => {
    outgoing.writeHead(response.statusCode ?? 502, response.headers);
    response.pipe(outgoing);
  });
  upstream.on('error', () => {
    if (!outgoing.headersSent) outgoing.writeHead(502);
    outgoing.end();
  });
  incoming.pipe(upstream);
});
server.keepAliveTimeout = 65_000;
server.listen(listen, '127.0.0.1', () => console.log(`Balanceador en ${listen} hacia ${targets.join(', ')}`));

