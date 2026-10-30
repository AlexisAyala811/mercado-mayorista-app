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
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = statusCode >= 500 ? undefined : getHttpPayload(exception);

    if (statusCode >= 500) {
      this.logger.error(
        JSON.stringify({
          exception:
            exception instanceof Error ? exception.name : 'UnknownError',
          method: request.method,
          path: request.path,
          requestId: request.requestId,
          statusCode,
        }),
      );
    }

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
