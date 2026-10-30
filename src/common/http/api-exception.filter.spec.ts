import {
  BadRequestException,
  ConflictException,
  Logger,
  type ArgumentsHost,
} from '@nestjs/common';
import type { AbstractHttpAdapter, HttpAdapterHost } from '@nestjs/core';

import { ApiExceptionFilter } from './api-exception.filter.js';

describe('ApiExceptionFilter', () => {
  const request = {
    method: 'POST',
    path: '/api/v1/example',
    requestId: 'request-1',
  };
  const response = {};

  afterEach(() => vi.restoreAllMocks());

  function setup() {
    const reply = vi.fn();
    const adapterHost = {
      httpAdapter: { reply } as unknown as AbstractHttpAdapter,
    } as HttpAdapterHost;
    const host = {
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue(request),
        getResponse: vi.fn().mockReturnValue(response),
      }),
    } as unknown as ArgumentsHost;
    return { filter: new ApiExceptionFilter(adapterHost), host, reply };
  }

  it('preserves safe client error messages and includes the request ID', () => {
    const { filter, host, reply } = setup();

    filter.catch(new BadRequestException(['Campo inválido']), host);

    expect(reply).toHaveBeenCalledWith(
      response,
      expect.objectContaining({
        message: ['Campo inválido'],
        requestId: 'request-1',
        statusCode: 400,
      }),
      400,
    );
  });

  it('does not expose unexpected exception details', () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const { filter, host, reply } = setup();

    filter.catch(new Error('database password should not leak'), host);

    expect(reply).toHaveBeenCalledWith(
      response,
      expect.objectContaining({
        message: 'Error interno del servidor.',
        requestId: 'request-1',
        statusCode: 500,
      }),
      500,
    );
    expect(JSON.stringify(reply.mock.calls)).not.toContain(
      'database password should not leak',
    );
  });

  it('preserves the stable code and current version of an optimistic conflict', () => {
    const { filter, host, reply } = setup();

    filter.catch(
      new ConflictException({
        code: 'inventory-version-conflict',
        currentVersion: 7,
        message: 'Revise.',
      }),
      host,
    );

    expect(reply).toHaveBeenCalledWith(
      response,
      expect.objectContaining({
        code: 'inventory-version-conflict',
        currentVersion: 7,
        statusCode: 409,
      }),
      409,
    );
  });
});
