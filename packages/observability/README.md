# @booklet/observability

Node-only boundary for runtime observability configuration, structured logging,
correlation IDs, and secret redaction. Consumers import only the contracts from
this package; Pino types and lifecycle remain internal.

Pass `process.env` to `parseObservabilityConfig` at the application bootstrap,
then create one root logger. Resolve an incoming request ID and derive a child
logger with `withCorrelationId`. Never log secrets. Keep potentially sensitive
record values in keyed fields rather than interpolated messages so the
defense-in-depth redaction policy can remove them.

Caller log fields are emitted under `data`; child bindings are emitted under
`context`. System fields such as `service`, `environment`, `correlationId`,
`level`, `time`, and `msg` remain owned by this package. Redaction is key-based:
it cannot reliably discover arbitrary secrets embedded in free-form log or
Error messages and stacks, so credentials must never be interpolated there.
Raw `Error` and `AggregateError` messages, stacks, and string causes are omitted
from structured output. Log a reviewed machine `errorCode` separately as a keyed
field when callers need an actionable classification.
