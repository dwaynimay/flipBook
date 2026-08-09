export const API_PREFIX = "api/v1";
export const IDEMPOTENCY_KEY_HEADER = "Idempotency-Key";
export const REQUEST_ID_HEADER = "X-Request-Id";

export const idempotencyKeyPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
