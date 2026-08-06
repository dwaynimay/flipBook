import { randomUUID } from "node:crypto";

const correlationIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const correlationConstructionToken = Symbol("CorrelationId construction token");
const issuedCorrelationIds = new WeakMap<CorrelationId, string>();

export class CorrelationId {
  readonly #value: string;

  private constructor(constructionToken: symbol, value: string) {
    if (constructionToken !== correlationConstructionToken) {
      throw new TypeError("Correlation ID must be created by the observability boundary.");
    }

    this.#value = value;
    issuedCorrelationIds.set(this, value);
  }

  static parse(input: unknown): CorrelationId | undefined {
    if (typeof input !== "string") {
      return undefined;
    }

    const normalized = input.trim();

    if (!correlationIdPattern.test(normalized)) {
      return undefined;
    }

    return new CorrelationId(correlationConstructionToken, normalized);
  }

  toString(): string {
    return this.#value;
  }
}

export interface CorrelatedLogger<TLogger> {
  readonly correlationId: CorrelationId;
  readonly logger: TLogger;
}

export function parseCorrelationId(input: unknown): CorrelationId | undefined {
  return CorrelationId.parse(input);
}

export function resolveCorrelationId(
  input: unknown,
  generate: () => string = randomUUID,
): CorrelationId {
  const supplied = parseCorrelationId(input);

  if (supplied !== undefined) {
    return supplied;
  }

  const generated = parseCorrelationId(generate());

  if (generated === undefined) {
    throw new Error("Correlation ID generator returned an invalid value.");
  }

  return generated;
}

export function readValidatedCorrelationId(input: unknown): string {
  if (!(input instanceof CorrelationId)) {
    throw new TypeError("Correlation ID must be created by the observability boundary.");
  }

  const canonicalValue = issuedCorrelationIds.get(input);

  if (canonicalValue === undefined) {
    throw new TypeError("Correlation ID was not issued by the observability boundary.");
  }

  return canonicalValue;
}
