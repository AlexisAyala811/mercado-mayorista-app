// Builds the Postman collection for the Administrator of merchants (spec 023).
// Run: node test/postman/build-admin-collection.mjs
// It is a separate collection because the login limit (5 per minute) is
// already used by the quality scenarios. No secrets: the Administrator's
// credentials arrive with --env-var; the merchant's passwords are random per run.
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
const lines = (text) =>
  text
    .trim()
    .split('\n')
    .map((line) => line.replace(/^ {4}/, ''));
const script = (listen, code) => ({
  listen,
  script: { type: 'text/javascript', exec: lines(code) },
});
const request = (name, method, path, { token, body, test, pre } = {}) => ({
  name,
  event: [
    ...(pre ? [script('prerequest', pre)] : []),
    ...(test ? [script('test', test)] : []),
  ],
  request: {
    method,
    auth: token ? auth(token) : { type: 'noauth' },
    header: body ? [{ key: 'Content-Type', value: 'application/json' }] : [],
    url: url(path),
    ...(body ? { body: json(body) } : {}),
  },
});
const folder = (name, description, item) => ({ name, description, item });
const status = (code) =>
  `pm.test('responde ${code}', () => pm.response.to.have.status(${code}));`;

const collection = {
  info: {
    name: 'MAÑAY · Administrador de comerciantes (spec 023)',
    description:
      'El Administrador da de alta comerciantes y da soporte a sus cuentas (suspender, reactivar, contraseña temporal) sin ver sus operaciones. Spec 023.',
    schema:
      'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  item: [
    folder('Administrador', 'Sesión del Administrador de la plataforma.', [
      request('Iniciar sesión · Administrador', 'POST', '/auth/sessions', {
        pre: `
    pm.collectionVariables.set('runId', Date.now().toString(36));
    pm.collectionVariables.set('merchantUser', 'qa_com_' + pm.collectionVariables.get('runId'));
    pm.collectionVariables.set('temporaryPassword', 'Tmp-' + pm.variables.replaceIn('{{$guid}}'));
    pm.collectionVariables.set('finalPassword', 'Fin-' + pm.variables.replaceIn('{{$guid}}'));
    pm.collectionVariables.set('createOperationId', pm.variables.replaceIn('{{$guid}}'));`,
        body: { username: '{{adminUser}}', password: '{{adminPassword}}' },
        test: `
    ${status(201)}
    pm.test('el rol es Administrador', () => pm.expect(pm.response.json().user.role).to.eql('admin'));
    pm.collectionVariables.set('tokenAdmin', pm.response.json().accessToken);`,
      }),
      request('No ve operaciones de ningún negocio', 'GET', '/receptions', {
        token: 'tokenAdmin',
        test: status(403),
      }),
    ]),
    folder(
      'Alta de comerciante',
      'Negocio y Mayorista en una transacción, idempotente por clientOperationId.',
      [
        request('Crear comerciante', 'POST', '/admin/merchants', {
          token: 'tokenAdmin',
          body: {
            clientOperationId: '{{createOperationId}}',
            businessName: 'Comercial QA {{runId}}',
            username: '{{merchantUser}}',
            temporaryPassword: '{{temporaryPassword}}',
          },
          test: `
    ${status(201)}
    pm.test('el Mayorista debe crear su contraseña', () => pm.expect(pm.response.json().wholesaler.mustChangePassword).to.eql(true));
    pm.collectionVariables.set('merchantId', pm.response.json().id);`,
        }),
        request('Reintento con el mismo UUID', 'POST', '/admin/merchants', {
          token: 'tokenAdmin',
          body: {
            clientOperationId: '{{createOperationId}}',
            businessName: 'Comercial QA {{runId}}',
            username: '{{merchantUser}}',
            temporaryPassword: '{{temporaryPassword}}',
          },
          test: `
    ${status(201)}
    pm.test('devuelve el mismo comerciante', () => pm.expect(pm.response.json().id).to.eql(pm.collectionVariables.get('merchantId')));`,
        }),
        request(
          'Buscar el comerciante',
          'GET',
          '/admin/merchants?search={{merchantUser}}',
          {
            token: 'tokenAdmin',
            test: `
    ${status(200)}
    pm.test('aparece una vez', () => pm.expect(pm.response.json().total).to.eql(1));`,
          },
        ),
      ],
    ),
    folder(
      'Primer acceso del Mayorista',
      'Con la contraseña temporal solo puede crear la suya.',
      [
        request('Iniciar sesión con la temporal', 'POST', '/auth/sessions', {
          body: {
            username: '{{merchantUser}}',
            password: '{{temporaryPassword}}',
          },
          test: `
    ${status(201)}
    pm.test('pide cambiar la contraseña', () => pm.expect(pm.response.json().user.mustChangePassword).to.eql(true));
    pm.collectionVariables.set('tokenMerchant', pm.response.json().accessToken);`,
        }),
        request('Otra ruta queda bloqueada', 'GET', '/accounts?limit=1', {
          token: 'tokenMerchant',
          test: `
    ${status(403)}
    pm.test('código password-change-required', () => pm.expect(pm.response.json().code).to.eql('password-change-required'));`,
        }),
        request('Crear su contraseña', 'PATCH', '/auth/password', {
          token: 'tokenMerchant',
          body: {
            currentPassword: '{{temporaryPassword}}',
            newPassword: '{{finalPassword}}',
          },
          test: status(204),
        }),
        request('Ya trabaja con normalidad', 'GET', '/accounts?limit=1', {
          token: 'tokenMerchant',
          test: status(200),
        }),
        request(
          'No entra a las rutas del Administrador',
          'GET',
          '/admin/merchants',
          {
            token: 'tokenMerchant',
            test: status(403),
          },
        ),
      ],
    ),
    folder(
      'Soporte',
      'Suspender corta el acceso al instante; cada acción lleva motivo y queda auditada.',
      [
        request(
          'Suspender',
          'POST',
          '/admin/merchants/{{merchantId}}/suspend',
          {
            token: 'tokenAdmin',
            body: {
              clientOperationId: '{{$guid}}',
              reason: 'Prueba de soporte',
            },
            test: `
    ${status(200)}
    pm.test('queda suspendido', () => pm.expect(pm.response.json().isActive).to.eql(false));`,
          },
        ),
        request(
          'La sesión del Mayorista deja de valer',
          'GET',
          '/auth/session',
          {
            token: 'tokenMerchant',
            test: status(401),
          },
        ),
        request(
          'Reactivar',
          'POST',
          '/admin/merchants/{{merchantId}}/reactivate',
          {
            token: 'tokenAdmin',
            body: {
              clientOperationId: '{{$guid}}',
              reason: 'Fin de la prueba',
            },
            test: `
    ${status(200)}
    pm.test('queda activo', () => pm.expect(pm.response.json().isActive).to.eql(true));`,
          },
        ),
        request(
          'Estado de la cuenta',
          'GET',
          '/admin/merchants/{{merchantId}}/status',
          {
            token: 'tokenAdmin',
            test: `
    ${status(200)}
    pm.test('informa intentos fallidos y sesiones', () => pm.expect(pm.response.json()).to.have.keys('activeAssistants', 'failedLoginAttempts', 'lastFailedLoginAt', 'merchant', 'openSessions'));`,
          },
        ),
      ],
    ),
  ],
};

const environment = {
  name: 'MAÑAY · API local · Administrador',
  values: [
    { key: 'baseUrl', value: 'http://127.0.0.1:3100/api/v1', enabled: true },
    { key: 'adminUser', value: '', enabled: true },
    { key: 'adminPassword', value: '', type: 'secret', enabled: true },
  ],
};

const dir = new URL('./', import.meta.url);
fs.writeFileSync(
  new URL('administrador.postman_collection.json', dir),
  JSON.stringify(collection, null, 2) + '\n',
);
fs.writeFileSync(
  new URL('administrador.postman_environment.json', dir),
  JSON.stringify(environment, null, 2) + '\n',
);
console.log('colección y entorno del Administrador generados');
