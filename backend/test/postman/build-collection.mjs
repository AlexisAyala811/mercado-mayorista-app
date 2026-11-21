// Builds the Postman collection for the quality scenarios of the Sprint 2
// (spec 017, T1708). Run: node test/postman/build-collection.mjs
// The collection carries no secrets: passwords arrive with --env-var.
import fs from 'node:fs';

const url = (path) => `{{baseUrl}}${path}`;
const json = (body) => ({
  mode: 'raw',
  raw: JSON.stringify(body, null, 2),
  options: { raw: { language: 'json' } },
});
const auth = (token) => ({
  type: 'bearer',
  bearer: [{ key: 'token', value: `{{${token}}}`, type: 'string' }],
});
const noAuth = { type: 'noauth' };
const lines = (text) =>
  text
    .trim()
    .split('\n')
    .map((line) => line.replace(/^ {4}/, ''));
const request = (name, method, path, { token, body, test, pre } = {}) => ({
  name,
  event: [
    ...(pre
      ? [
          {
            listen: 'prerequest',
            script: { type: 'text/javascript', exec: lines(pre) },
          },
        ]
      : []),
    ...(test
      ? [
          {
            listen: 'test',
            script: { type: 'text/javascript', exec: lines(test) },
          },
        ]
      : []),
  ],
  request: {
    method,
    auth: token ? auth(token) : noAuth,
    header: body ? [{ key: 'Content-Type', value: 'application/json' }] : [],
    url: url(path),
    ...(body ? { body: json(body) } : {}),
  },
});
const folder = (name, description, item) => ({ name, description, item });

const collection = {
  info: {
    name: 'MAÑAY · Escenarios de calidad (Sprint 2)',
    description:
      'Escenarios de atributos de calidad del Sprint 1 contra la API REST /api/v1: AC01 (respuesta), AC03 (idempotencia y UUID reutilizado), AC04 (aislamiento por negocio con auditoría), roles del Encargado con reemplazo (HU12) y límite de intentos de inicio de sesión. Spec 017, T1708.',
    schema:
      'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  variable: [{ key: 'maxResponseMs', value: '3000' }],
  item: [
    folder(
      'AC01 · Disponibilidad y tiempo de respuesta',
      'p95 central < 3 s (AC01). Aquí se mide una petición; la carga se mide con k6.',
      [
        request('Salud de la API y la base', 'GET', '/health/ready', {
          test: `
    pm.test('responde 200', () => pm.response.to.have.status(200));
    pm.test('la base de datos está disponible', () => pm.expect(JSON.stringify(pm.response.json())).to.include('up'));
    pm.test('responde en menos de 3 s (AC01)', () => pm.expect(pm.response.responseTime).to.be.below(Number(pm.collectionVariables.get('maxResponseMs'))));`,
        }),
      ],
    ),
    folder('Autenticación', 'Token de sesión opaco; sin token no hay acceso.', [
      request(
        'Iniciar sesión · Mayorista del negocio A',
        'POST',
        '/auth/sessions',
        {
          body: { username: '{{userA}}', password: '{{passwordA}}' },
          test: `
    pm.test('responde 201 con token', () => { pm.response.to.have.status(201); pm.expect(pm.response.json().accessToken).to.be.a('string'); });
    pm.test('el rol es Mayorista', () => pm.expect(pm.response.json().user.role).to.eql('wholesaler'));
    pm.collectionVariables.set('tokenA', pm.response.json().accessToken);`,
        },
      ),
      request('Contraseña incorrecta', 'POST', '/auth/sessions', {
        body: { username: '{{userA}}', password: 'incorrecta-de-prueba' },
        test: `
    pm.test('responde 401', () => pm.response.to.have.status(401));
    pm.test('no entrega token', () => pm.expect(pm.response.json().accessToken).to.be.undefined);`,
      }),
      request('Consulta sin token', 'GET', '/catalog/providers', {
        test: `pm.test('responde 401', () => pm.response.to.have.status(401));`,
      }),
    ]),
    folder(
      'Preparación',
      'Proveedor y variedad del negocio A para las recepciones de prueba.',
      [
        request('Crear proveedor', 'POST', '/catalog/providers', {
          token: 'tokenA',
          pre: `pm.collectionVariables.set('runId', Date.now().toString(36));`,
          body: { name: 'Proveedor QA {{runId}}' },
          test: `
    pm.test('responde 201', () => pm.response.to.have.status(201));
    pm.collectionVariables.set('providerId', pm.response.json().id);`,
        }),
        request('Crear variedad', 'POST', '/catalog/varieties', {
          token: 'tokenA',
          body: { name: 'Papa QA {{runId}}' },
          test: `
    pm.test('responde 201', () => pm.response.to.have.status(201));
    pm.collectionVariables.set('varietyId', pm.response.json().id);`,
        }),
      ],
    ),
    folder(
      'AC03 · Idempotencia',
      'La misma operación cinco veces deja un solo registro; el mismo UUID con otros datos responde 409 operation-id-conflict sin cambiar el original.',
      [
        request(
          'Enviar la misma recepción cinco veces',
          'POST',
          '/receptions',
          {
            token: 'tokenA',
            pre: `
    const sent = Number(pm.collectionVariables.get('sends') || 0) + 1;
    pm.collectionVariables.set('sends', sent);
    if (sent === 1) pm.collectionVariables.set('operationId', pm.variables.replaceIn('{{$guid}}'));`,
            body: {
              clientOperationId: '{{operationId}}',
              providerId: '{{providerId}}',
              driverName: 'Chofer QA',
              receivedOn: '2026-11-21',
              expectedVarietyIds: ['{{varietyId}}'],
            },
            test: `
    const sent = Number(pm.collectionVariables.get('sends'));
    pm.test(\`envío \${sent}: responde 201\`, () => pm.response.to.have.status(201));
    const id = pm.response.json().id;
    if (sent === 1) pm.collectionVariables.set('receptionId', id);
    else pm.test(\`envío \${sent}: devuelve la misma recepción\`, () => pm.expect(id).to.eql(pm.collectionVariables.get('receptionId')));
    if (sent < 5) pm.execution.setNextRequest(pm.info.requestName);
    else pm.collectionVariables.set('sends', 0);`,
          },
        ),
        request(
          'Solo existe una recepción',
          'GET',
          '/receptions?providerId={{providerId}}',
          {
            token: 'tokenA',
            test: `
    pm.test('responde 200', () => pm.response.to.have.status(200));
    pm.test('un solo registro tras cinco envíos', () => pm.expect(pm.response.json().total).to.eql(1));`,
          },
        ),
        request('Mismo UUID con otros datos', 'POST', '/receptions', {
          token: 'tokenA',
          body: {
            clientOperationId: '{{operationId}}',
            providerId: '{{providerId}}',
            driverName: 'Otro chofer',
            receivedOn: '2026-11-21',
            expectedVarietyIds: ['{{varietyId}}'],
          },
          test: `
    pm.test('responde 409', () => pm.response.to.have.status(409));
    pm.test('código operation-id-conflict', () => pm.expect(pm.response.json().code).to.eql('operation-id-conflict'));`,
        }),
        request(
          'El registro original no cambió',
          'GET',
          '/receptions/{{receptionId}}',
          {
            token: 'tokenA',
            test: `
    pm.test('responde 200', () => pm.response.to.have.status(200));
    pm.test('conserva los datos del primer envío', () => pm.expect(pm.response.json().driverName).to.eql('Chofer QA'));`,
          },
        ),
      ],
    ),
    folder(
      'AC04 · Aislamiento por negocio',
      'Otro negocio no ve los datos; el intento queda en su auditoría y la respuesta no revela nada.',
      [
        request(
          'Iniciar sesión · Mayorista del negocio B',
          'POST',
          '/auth/sessions',
          {
            body: { username: '{{userB}}', password: '{{passwordB}}' },
            test: `
    pm.test('responde 201', () => pm.response.to.have.status(201));
    pm.test('es otro negocio', () => pm.expect(pm.response.json().user.businessId).to.not.eql(pm.collectionVariables.get('businessA')));
    pm.collectionVariables.set('tokenB', pm.response.json().accessToken);`,
          },
        ),
        request(
          'B pide la recepción de A',
          'GET',
          '/receptions/{{receptionId}}',
          {
            token: 'tokenB',
            test: `
    pm.test('responde 404', () => pm.response.to.have.status(404));
    pm.test('no expone datos de A', () => { const text = pm.response.text(); pm.expect(text).to.not.include('Chofer QA'); pm.expect(text).to.not.include(pm.collectionVariables.get('providerId')); });`,
          },
        ),
        request(
          'B no ve recepciones ni proveedores de A',
          'GET',
          '/receptions?providerId={{providerId}}',
          {
            token: 'tokenB',
            test: `
    pm.test('responde 200', () => pm.response.to.have.status(200));
    pm.test('cero registros', () => pm.expect(pm.response.json().total).to.eql(0));`,
          },
        ),
        request(
          'El intento queda en la auditoría de B',
          'GET',
          '/audit/events?action=authorization.cross-business-denied',
          {
            token: 'tokenB',
            test: `
    pm.test('responde 200', () => pm.response.to.have.status(200));
    pm.test('registra el intento sobre la recepción de A', () => pm.expect(pm.response.json().items.map((item) => item.resourceId)).to.include(pm.collectionVariables.get('receptionId')));`,
          },
        ),
      ],
    ),
    folder(
      'Roles · Encargado con reemplazo (HU12)',
      'El Encargado solo entra con un reemplazo vigente, registra operaciones y no accede a funciones del Mayorista; las denegaciones se auditan y revocar el reemplazo corta su sesión.',
      [
        request('Mayorista crea un Encargado', 'POST', '/identity/assistants', {
          token: 'tokenA',
          pre: `
    pm.collectionVariables.set('assistantUser', 'qa_enc_' + pm.collectionVariables.get('runId'));
    pm.collectionVariables.set('assistantPassword', pm.variables.replaceIn('{{$guid}}'));`,
          body: {
            username: '{{assistantUser}}',
            password: '{{assistantPassword}}',
          },
          test: `
    pm.test('responde 201', () => pm.response.to.have.status(201));
    pm.test('el rol es Encargado', () => pm.expect(pm.response.json().role).to.eql('assistant'));
    pm.collectionVariables.set('assistantId', pm.response.json().id);`,
        }),
        request('Encargado sin reemplazo no entra', 'POST', '/auth/sessions', {
          body: {
            username: '{{assistantUser}}',
            password: '{{assistantPassword}}',
          },
          test: `pm.test('responde 401', () => pm.response.to.have.status(401));`,
        }),
        request(
          'Mayorista autoriza un reemplazo de 2 h',
          'POST',
          '/identity/assistants/{{assistantId}}/delegations',
          {
            token: 'tokenA',
            pre: `
    pm.collectionVariables.set('startsAt', new Date(Date.now() - 60000).toISOString());
    pm.collectionVariables.set('expiresAt', new Date(Date.now() + 2 * 3600000).toISOString());`,
            body: {
              startsAt: '{{startsAt}}',
              expiresAt: '{{expiresAt}}',
              reason: 'Prueba de calidad Sprint 2',
            },
            test: `
    pm.test('responde 201', () => pm.response.to.have.status(201));
    pm.collectionVariables.set('delegationId', pm.response.json().id);`,
          },
        ),
        request('Iniciar sesión · Encargado', 'POST', '/auth/sessions', {
          body: {
            username: '{{assistantUser}}',
            password: '{{assistantPassword}}',
          },
          test: `
    pm.test('responde 201', () => pm.response.to.have.status(201));
    pm.collectionVariables.set('tokenAssistant', pm.response.json().accessToken);`,
        }),
        request('Encargado registra una recepción', 'POST', '/receptions', {
          token: 'tokenAssistant',
          body: {
            clientOperationId: '{{$guid}}',
            providerId: '{{providerId}}',
            driverName: 'Chofer del Encargado',
            receivedOn: '2026-11-21',
            expectedVarietyIds: ['{{varietyId}}'],
          },
          test: `pm.test('responde 201', () => pm.response.to.have.status(201));`,
        }),
        request(
          'Encargado no administra usuarios',
          'GET',
          '/identity/assistants',
          {
            token: 'tokenAssistant',
            test: `pm.test('responde 403', () => pm.response.to.have.status(403));`,
          },
        ),
        request('Encargado no consulta la auditoría', 'GET', '/audit/events', {
          token: 'tokenAssistant',
          test: `pm.test('responde 403', () => pm.response.to.have.status(403));`,
        }),
        request(
          'La denegación queda auditada',
          'GET',
          '/audit/events?action=authorization.denied',
          {
            token: 'tokenA',
            test: `
    pm.test('responde 200', () => pm.response.to.have.status(200));
    pm.test('registra al Encargado', () => pm.expect(pm.response.json().items.map((item) => item.actorUserId)).to.include(pm.collectionVariables.get('assistantId')));`,
          },
        ),
        request(
          'Mayorista revoca el reemplazo',
          'DELETE',
          '/identity/delegations/{{delegationId}}',
          {
            token: 'tokenA',
            test: `pm.test('responde 2xx', () => pm.expect(pm.response.code).to.be.within(200, 204));`,
          },
        ),
        request(
          'La sesión del Encargado deja de valer',
          'GET',
          '/catalog/providers',
          {
            token: 'tokenAssistant',
            test: `pm.test('responde 401', () => pm.response.to.have.status(401));`,
          },
        ),
      ],
    ),
    folder(
      'Seguridad · límite de intentos',
      'Inicio de sesión limitado a 5 intentos por minuto por cliente. Este es el sexto de la corrida.',
      [
        request('Sexto intento en un minuto', 'POST', '/auth/sessions', {
          body: { username: '{{userA}}', password: 'incorrecta-de-prueba' },
          test: `pm.test('responde 429', () => pm.response.to.have.status(429));`,
        }),
      ],
    ),
  ],
};

// businessA comes from the first login; set it there too.
collection.item[1].item[0].event[0].script.exec.push(
  "pm.collectionVariables.set('businessA', pm.response.json().user.businessId);",
);

const environment = {
  name: 'MAÑAY · API local',
  values: [
    { key: 'baseUrl', value: 'http://127.0.0.1:3100/api/v1', enabled: true },
    { key: 'userA', value: '', enabled: true },
    { key: 'passwordA', value: '', type: 'secret', enabled: true },
    { key: 'userB', value: '', enabled: true },
    { key: 'passwordB', value: '', type: 'secret', enabled: true },
  ],
};

const dir = new URL('./', import.meta.url);
fs.writeFileSync(
  new URL('escenarios-calidad.postman_collection.json', dir),
  JSON.stringify(collection, null, 2) + '\n',
);
fs.writeFileSync(
  new URL('local.postman_environment.json', dir),
  JSON.stringify(environment, null, 2) + '\n',
);
console.log('colección y entorno generados');
