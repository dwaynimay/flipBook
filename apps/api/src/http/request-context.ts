import { resolveCorrelationId, type CorrelationId } from "@booklet/observability";
import type { NextFunction, Request, Response } from "express";

import { REQUEST_ID_HEADER } from "../api.constants.js";

const correlationIdsByRequest = new WeakMap<object, CorrelationId>();

export function getRequestCorrelationId(request: unknown): CorrelationId {
  if ((typeof request !== "object" || request === null) && typeof request !== "function") {
    return resolveCorrelationId(undefined);
  }

  const existing = correlationIdsByRequest.get(request);
  if (existing !== undefined) {
    return existing;
  }

  const generated = resolveCorrelationId(undefined);
  correlationIdsByRequest.set(request, generated);
  return generated;
}

export function getRequestId(request: unknown): string {
  return getRequestCorrelationId(request).toString();
}

export function requestContextMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const correlationId = resolveCorrelationId(request.header(REQUEST_ID_HEADER));
  correlationIdsByRequest.set(request, correlationId);
  response.setHeader(REQUEST_ID_HEADER, correlationId.toString());
  next();
}
