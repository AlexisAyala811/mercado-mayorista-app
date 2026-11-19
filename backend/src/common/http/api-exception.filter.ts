import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ExceptionFilter,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

import type { RequestWithId } from './request-context.middleware.js';

// Spec 017 (T1704): when every connection of the pool is busy, pg-pool waits
// DATABASE_CONNECT_TIMEOUT_MS and then fails with one of these messages. The
// API is saturated, not broken: answer 503 with Retry-After so the tablet
// keeps the operation queued and tries again.
const saturationMessages = [
  'timeout exceeded when trying to connect',
  'Connection terminated due to connection timeout',
];
export const saturationRetryAfterSeconds = 5;

export function isDatabaseSaturation(exception: unknown) {
  return (
    exception instanceof Error &&
    saturationMessages.some((message) => exception.message.includes(message))
  );
}

type HttpErrorPayload = {
  code?: unknown;
  currentVersion?: unknown;
  error?: unknown;
  message?: unknown;
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<RequestWithId>();
    const saturated = isDatabaseSaturation(exception);
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : saturated
          ? HttpStatus.SERVICE_UNAVAILABLE
          : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = saturated
      ? {
          code: 'service-saturated',
          message:
            'El servidor está ocupado. La operación se reintentará en unos segundos.',
        }
      : statusCode >= 500
        ? undefined
        : getHttpPayload(exception);

    if (statusCode >= 500) {
      this.logger.error(
        JSON.stringify({
          cause: saturated ? 'database-pool-saturated' : undefined,
          exception:
            exception instanceof Error ? exception.name : 'UnknownError',
          method: request.method,
          path: request.path,
          requestId: request.requestId,
          statusCode,
        }),
      );
    }

    if (saturated)
      this.adapterHost.httpAdapter.setHeader(
        context.getResponse(),
        'Retry-After',
        String(saturationRetryAfterSeconds),
      );
    this.adapterHost.httpAdapter.reply(
      context.getResponse(),
      {
        error: payload?.error,
        code: payload?.code,
        currentVersion: payload?.currentVersion,
        message:
          payload?.message ??
          (statusCode >= 500
            ? 'Error interno del servidor.'
            : 'La solicitud no pudo procesarse.'),
        path: request.path,
        requestId: request.requestId,
        statusCode,
        timestamp: new Date().toISOString(),
      },
      statusCode,
    );
  }
}

function getHttpPayload(exception: unknown): HttpErrorPayload | undefined {
  if (!(exception instanceof HttpException)) return undefined;
  const response = exception.getResponse();
  return typeof response === 'string'
    ? { message: response }
    : (response as HttpErrorPayload);
}
