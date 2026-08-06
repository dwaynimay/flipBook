export const REDACTED_VALUE = "[REDACTED]";

const CIRCULAR_VALUE = "[Circular]";
const ERROR_CAUSE_OMITTED = "[Error cause omitted]";
const ERROR_TEXT_OMITTED = "[Error text omitted]";
const INVALID_DATE_VALUE = "[Invalid Date]";
const UNSUPPORTED_OBJECT_VALUE = "[Unsupported object]";

const allowedErrorTypes = new Set([
  "AggregateError",
  "Error",
  "EvalError",
  "RangeError",
  "ReferenceError",
  "SyntaxError",
  "TypeError",
  "URIError",
]);

const sensitiveKeys = new Set([
  "accesskey",
  "accesskeyid",
  "apikey",
  "authorization",
  "authorizationheader",
  "authheader",
  "awsaccesskeyid",
  "awssecretaccesskey",
  "clientsecret",
  "cookie",
  "credentials",
  "databaseurl",
  "encryptionkey",
  "miniorootpassword",
  "miniorootuser",
  "password",
  "passwd",
  "privatekey",
  "proxyauthorization",
  "proxyauthorizationheader",
  "pwd",
  "s3accesskey",
  "s3secretaccesskey",
  "secret",
  "secretaccesskey",
  "sessioncookie",
  "setcookie",
  "storageaccesskey",
  "storagecredential",
  "storagecredentials",
  "storagesecretkey",
  "token",
  "tokens",
]);

const sensitiveKeySuffixes = [
  "apikey",
  "authorization",
  "authorizationheader",
  "credential",
  "credentials",
  "encryptionkey",
  "password",
  "passwordhash",
  "privatekey",
  "secret",
  "secretaccesskey",
  "secrethash",
  "sessioncookie",
  "token",
  "tokenhash",
  "tokens",
] as const;

function normalizeKey(key: string): string {
  return key.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
}

export function isSensitiveKey(key: string): boolean {
  const normalized = normalizeKey(key);
  return (
    sensitiveKeys.has(normalized) ||
    sensitiveKeySuffixes.some((suffix) => normalized.endsWith(suffix))
  );
}

function isPlainObject(value: object): boolean {
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function serializeDate(value: Date): string {
  return Number.isNaN(value.getTime()) ? INVALID_DATE_VALUE : value.toISOString();
}

function projectErrorData(
  value: unknown,
  ancestors: WeakSet<object>,
  textPlaceholder: string,
): unknown {
  if (value === null || typeof value === "boolean" || typeof value === "number") {
    return value;
  }

  if (typeof value !== "object") {
    return textPlaceholder;
  }

  if (value instanceof Date) {
    return serializeDate(value);
  }

  if (value instanceof Error) {
    return redactValue(value, ancestors);
  }

  if (ancestors.has(value)) {
    return CIRCULAR_VALUE;
  }

  ancestors.add(value);

  if (Array.isArray(value)) {
    const projected = value.map((entry) => projectErrorData(entry, ancestors, textPlaceholder));
    ancestors.delete(value);
    return projected;
  }

  if (!isPlainObject(value)) {
    ancestors.delete(value);
    return UNSUPPORTED_OBJECT_VALUE;
  }

  const projectedEntries = Object.entries(value).map(([key, entry]): readonly [string, unknown] => [
    key,
    isSensitiveKey(key) ? REDACTED_VALUE : projectErrorData(entry, ancestors, textPlaceholder),
  ]);

  ancestors.delete(value);
  return Object.fromEntries(projectedEntries);
}

function projectError(value: Error, ancestors: WeakSet<object>): Readonly<Record<string, unknown>> {
  const errorType = allowedErrorTypes.has(value.name) ? value.name : "Error";
  const projectedEntries: Array<readonly [string, unknown]> = [["type", errorType]];

  if (value.cause !== undefined) {
    projectedEntries.push(["cause", projectErrorData(value.cause, ancestors, ERROR_CAUSE_OMITTED)]);
  }

  if (value instanceof AggregateError) {
    const errors: readonly unknown[] = value.errors;
    projectedEntries.push([
      "errors",
      errors.map((error) => projectErrorData(error, ancestors, ERROR_CAUSE_OMITTED)),
    ]);
  }

  const standardKeys = new Set(["name", "message", "stack", "cause", "errors"]);
  const metadataEntries = Object.entries(value)
    .filter(([key]) => !standardKeys.has(key))
    .map(([key, entry]): readonly [string, unknown] => [
      key,
      isSensitiveKey(key) ? REDACTED_VALUE : projectErrorData(entry, ancestors, ERROR_TEXT_OMITTED),
    ]);

  if (metadataEntries.length > 0) {
    projectedEntries.push(["metadata", Object.fromEntries(metadataEntries)]);
  }

  return Object.fromEntries(projectedEntries);
}

function redactValue(value: unknown, ancestors: WeakSet<object>): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (value instanceof Date) {
    return serializeDate(value);
  }

  if (ancestors.has(value)) {
    return CIRCULAR_VALUE;
  }

  ancestors.add(value);

  if (value instanceof Error) {
    const projected = projectError(value, ancestors);
    ancestors.delete(value);
    return projected;
  }

  if (Array.isArray(value)) {
    const redacted = value.map((entry) => redactValue(entry, ancestors));
    ancestors.delete(value);
    return redacted;
  }

  if (!isPlainObject(value)) {
    ancestors.delete(value);
    return UNSUPPORTED_OBJECT_VALUE;
  }

  const redactedEntries = Object.entries(value).map(([key, entry]): readonly [string, unknown] => [
    key,
    isSensitiveKey(key) ? REDACTED_VALUE : redactValue(entry, ancestors),
  ]);

  ancestors.delete(value);
  return Object.fromEntries(redactedEntries);
}

export function redactSensitiveData(value: unknown): unknown {
  return redactValue(value, new WeakSet<object>());
}
