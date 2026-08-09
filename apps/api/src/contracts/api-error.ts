import { HttpException, HttpStatus } from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export const apiErrorCodes = [
  "BAD_REQUEST",
  "CONFLICT",
  "FORBIDDEN",
  "INTERNAL_ERROR",
  "INVALID_IDEMPOTENCY_KEY",
  "NOT_FOUND",
  "RATE_LIMITED",
  "UNAUTHORIZED",
  "VALIDATION_FAILED",
] as const;

export type ApiErrorCode = (typeof apiErrorCodes)[number];

export const apiErrorDetailReasons = [
  "invalid_value",
  "length_out_of_range",
  "must_be_string",
  "unknown_field",
] as const;

export type ApiErrorDetailReason = (typeof apiErrorDetailReasons)[number];
export const MAX_PUBLIC_ERROR_DETAILS = 32;
const apiErrorDetailReasonSet = new Set<string>(apiErrorDetailReasons);
const publicFieldPathPattern = /^[A-Za-z0-9_-]{1,64}(?:\.[A-Za-z0-9_-]{1,64})*$/;
const apiProblemConstructionToken = Symbol("ApiProblem construction");
const issuedApiProblems = new WeakSet<object>();
const invalidApiErrorDetailsMessage = "Validation details must use the public error registry.";

function isApiErrorDetailReason(value: unknown): value is ApiErrorDetailReason {
  return typeof value === "string" && apiErrorDetailReasonSet.has(value);
}

function rejectInvalidApiErrorDetails(): never {
  throw new TypeError(invalidApiErrorDetailsMessage);
}

function isArrayObject(value: unknown): value is object {
  try {
    return Array.isArray(value);
  } catch {
    return false;
  }
}

function readOwnProperty(value: object, property: PropertyKey): unknown {
  try {
    return Reflect.get(value, property);
  } catch {
    return rejectInvalidApiErrorDetails();
  }
}

function snapshotApiErrorDetail(value: unknown): ApiErrorDetail {
  if (typeof value !== "object" || value === null) {
    return rejectInvalidApiErrorDetails();
  }

  let field: unknown;
  let reason: unknown;
  let propertyReadFailed = false;

  try {
    field = Reflect.get(value, "field");
  } catch {
    propertyReadFailed = true;
  }

  try {
    reason = Reflect.get(value, "reason");
  } catch {
    propertyReadFailed = true;
  }

  if (
    propertyReadFailed ||
    typeof field !== "string" ||
    !publicFieldPathPattern.test(field) ||
    !isApiErrorDetailReason(reason)
  ) {
    return rejectInvalidApiErrorDetails();
  }

  return Object.freeze({ field, reason });
}

function snapshotApiErrorDetails(value: unknown): readonly ApiErrorDetail[] {
  if (!isArrayObject(value)) {
    return rejectInvalidApiErrorDetails();
  }

  const length = readOwnProperty(value, "length");
  if (
    typeof length !== "number" ||
    !Number.isSafeInteger(length) ||
    length < 0 ||
    length > MAX_PUBLIC_ERROR_DETAILS
  ) {
    return rejectInvalidApiErrorDetails();
  }

  let ownKeys: readonly PropertyKey[];
  try {
    ownKeys = Reflect.ownKeys(value);
  } catch {
    return rejectInvalidApiErrorDetails();
  }

  const ownKeySet = new Set<PropertyKey>(ownKeys);
  if (ownKeySet.size !== length + 1 || !ownKeySet.has("length")) {
    return rejectInvalidApiErrorDetails();
  }

  const safeDetails: ApiErrorDetail[] = [];
  for (let index = 0; index < length; index += 1) {
    const property = String(index);
    if (!ownKeySet.has(property)) {
      return rejectInvalidApiErrorDetails();
    }

    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Reflect.getOwnPropertyDescriptor(value, property);
    } catch {
      return rejectInvalidApiErrorDetails();
    }

    if (descriptor === undefined || descriptor.enumerable !== true) {
      return rejectInvalidApiErrorDetails();
    }

    const detail = readOwnProperty(value, property);
    if (detail === undefined) {
      return rejectInvalidApiErrorDetails();
    }
    safeDetails.push(snapshotApiErrorDetail(detail));
  }

  return Object.freeze(safeDetails);
}

export interface ApiErrorDetail {
  readonly field: string;
  readonly reason: ApiErrorDetailReason;
}

export class ApiErrorDetailDto implements ApiErrorDetail {
  @ApiProperty({ example: "title" })
  readonly field!: string;

  @ApiProperty({ enum: apiErrorDetailReasons, example: "length_out_of_range" })
  readonly reason!: ApiErrorDetailReason;
}

export class ApiErrorDto {
  @ApiProperty({ enum: apiErrorCodes, example: "VALIDATION_FAILED" })
  readonly code!: ApiErrorCode;

  @ApiProperty({ example: "Periksa kembali data yang dikirim." })
  readonly message!: string;

  @ApiProperty({ example: "ad7c22c2-8ed1-4df2-bb46-38bc930ecb67" })
  readonly requestId!: string;

  @ApiPropertyOptional({ type: [ApiErrorDetailDto] })
  readonly details?: readonly ApiErrorDetailDto[];
}

export class ApiErrorEnvelopeDto {
  @ApiProperty({ type: ApiErrorDto })
  readonly error!: ApiErrorDto;
}

interface ApiProblemOptions {
  readonly code: ApiErrorCode;
  readonly details?: readonly ApiErrorDetail[];
  readonly message: string;
  readonly status: HttpStatus;
}

export class ApiProblem extends HttpException {
  readonly code: ApiErrorCode;
  readonly details: readonly ApiErrorDetail[] | undefined;
  override readonly message: string;

  private constructor(token: symbol, options: ApiProblemOptions) {
    if (token !== apiProblemConstructionToken) {
      throw new TypeError("ApiProblem instances must be created by a public factory.");
    }

    super(options.message, options.status);
    this.code = options.code;
    this.details = options.details === undefined ? undefined : Object.freeze(options.details);
    this.message = options.message;
    issuedApiProblems.add(this);
    Object.freeze(this);
  }

  static invalidIdempotencyKey(): ApiProblem {
    return new ApiProblem(apiProblemConstructionToken, {
      code: "INVALID_IDEMPOTENCY_KEY",
      message: "Idempotency-Key wajib berisi 8-128 karakter aman.",
      status: HttpStatus.BAD_REQUEST,
    });
  }

  static validationFailed(details: unknown): ApiProblem {
    return new ApiProblem(apiProblemConstructionToken, {
      code: "VALIDATION_FAILED",
      details: snapshotApiErrorDetails(details),
      message: "Periksa kembali data yang dikirim.",
      status: HttpStatus.BAD_REQUEST,
    });
  }
}

export function isIssuedApiProblem(value: unknown): value is ApiProblem {
  return typeof value === "object" && value !== null && issuedApiProblems.has(value);
}
