import { withCorrelationId, type StructuredLogger } from "@booklet/observability";
import {
  Catch,
  HttpException,
  HttpStatus,
  type ArgumentsHost,
  type ExceptionFilter,
} from "@nestjs/common";
import type { HttpAdapterHost } from "@nestjs/core";

import {
  isIssuedApiProblem,
  type ApiErrorCode,
  type ApiErrorDetail,
  type ApiErrorEnvelopeDto,
} from "../contracts/api-error.js";
import { getRequestCorrelationId } from "./request-context.js";

interface PublicError {
  readonly code: ApiErrorCode;
  readonly details?: readonly ApiErrorDetail[];
  readonly message: string;
  readonly status: HttpStatus;
}

const publicErrorsByStatus = new Map<HttpStatus, Omit<PublicError, "status">>([
  [HttpStatus.BAD_REQUEST, { code: "BAD_REQUEST", message: "Periksa kembali permintaan Anda." }],
  [HttpStatus.UNAUTHORIZED, { code: "UNAUTHORIZED", message: "Silakan masuk untuk melanjutkan." }],
  [
    HttpStatus.FORBIDDEN,
    { code: "FORBIDDEN", message: "Anda tidak memiliki izin untuk tindakan ini." },
  ],
  [HttpStatus.NOT_FOUND, { code: "NOT_FOUND", message: "Data yang diminta tidak ditemukan." }],
  [
    HttpStatus.CONFLICT,
    { code: "CONFLICT", message: "Permintaan bertentangan dengan kondisi data saat ini." },
  ],
  [
    HttpStatus.TOO_MANY_REQUESTS,
    { code: "RATE_LIMITED", message: "Terlalu banyak permintaan. Coba lagi nanti." },
  ],
]);

function normalizeException(exception: unknown): PublicError {
  if (isIssuedApiProblem(exception)) {
    const details = exception.details;
    return {
      code: exception.code,
      ...(details === undefined ? {} : { details }),
      message: exception.message,
      status: exception.getStatus(),
    };
  }

  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const publicError = publicErrorsByStatus.get(status);

    if (publicError !== undefined) {
      return { ...publicError, status };
    }
  }

  return {
    code: "INTERNAL_ERROR",
    message: "Terjadi kendala pada layanan. Gunakan ID permintaan saat menghubungi dukungan.",
    status: HttpStatus.INTERNAL_SERVER_ERROR,
  };
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private readonly logger: StructuredLogger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request: unknown = http.getRequest<unknown>();
    const response: unknown = http.getResponse<unknown>();
    const normalized = normalizeException(exception);
    const correlationId = getRequestCorrelationId(request);
    const requestId = correlationId.toString();
    const body: ApiErrorEnvelopeDto = {
      error: {
        code: normalized.code,
        ...(normalized.details === undefined ? {} : { details: normalized.details }),
        message: normalized.message,
        requestId,
      },
    };

    if (normalized.code === "INTERNAL_ERROR") {
      withCorrelationId(this.logger, correlationId).logger.error(
        "Unexpected API request failure.",
        {
          errorCode: normalized.code,
          errorKind: exception instanceof Error ? "Error" : typeof exception,
        },
      );
    }

    this.adapterHost.httpAdapter.reply(response, body, normalized.status);
  }
}
