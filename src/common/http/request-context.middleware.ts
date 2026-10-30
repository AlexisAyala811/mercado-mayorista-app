import { randomUUID } from 'node:crypto';

import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const REQUEST_ID_HEADER = 'x-request-id';
const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{1,100}$/;
const logger = new Logger('HttpRequest');

export type RequestWithId = Request & { requestId: string };

export function requestContextMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const incoming = request.header(REQUEST_ID_HEADER);
  const requestId =
    incoming && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
  const startedAt = performance.now();

  (request as RequestWithId).requestId = requestId;
  response.setHeader(REQUEST_ID_HEADER, requestId);
  response.on('finish', () => {
    const durationMs = Math.round((performance.now() - startedAt) * 10) / 10;
    const message = JSON.stringify({
      durationMs,
      method: request.method,
      path: request.path,
      requestId,
      statusCode: response.statusCode,
    });
    if (response.statusCode >= 500) logger.error(message);
    else logger.log(message);
  });

  next();
}
