import type { NextFunction, Request, Response } from 'express';

import {
  requestContextMiddleware,
  type RequestWithId,
} from './request-context.middleware.js';

describe('requestContextMiddleware', () => {
  it('keeps a safe incoming request ID and returns it in the response', () => {
    const request = {
      header: jest.fn().mockReturnValue('mobile-123'),
      method: 'GET',
      path: '/api/v1/health/live',
    } as unknown as Request;
    const setHeader = jest.fn();
    const response = {
      on: jest.fn(),
      setHeader,
      statusCode: 200,
    } as unknown as Response;
    const next = jest.fn() as NextFunction;

    requestContextMiddleware(request, response, next);

    expect((request as RequestWithId).requestId).toBe('mobile-123');
    expect(setHeader).toHaveBeenCalledWith('x-request-id', 'mobile-123');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('replaces unsafe incoming identifiers', () => {
    const request = {
      header: jest.fn().mockReturnValue('invalid request id with spaces'),
      method: 'GET',
      path: '/',
    } as unknown as Request;
    const response = {
      on: jest.fn(),
      setHeader: jest.fn(),
      statusCode: 200,
    } as unknown as Response;

    requestContextMiddleware(request, response, jest.fn());

    expect((request as RequestWithId).requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect((request as RequestWithId).requestId).not.toBe(
      'invalid request id with spaces',
    );
  });
});
