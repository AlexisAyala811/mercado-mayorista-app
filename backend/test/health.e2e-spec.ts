import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import type { Server } from 'node:http';
import { configureHttpApplication } from '../src/configure-http-application.js';

describe('Health (e2e)', () => {
  let app: INestApplication<Server>;

  beforeAll(async () => {
    const { AppModule } = await import('../src/app.module.js');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication<NestExpressApplication>();
    configureHttpApplication(app as NestExpressApplication);
    await app.init();
  });

  it('reports process and database readiness', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/health/live')
      .expect(200)
      .expect({ status: 'ok' });
    await request(app.getHttpServer()).get('/api/v1/health/ready').expect(200);
  });

  afterAll(async () => {
    if (app) await app.close();
  });
});
