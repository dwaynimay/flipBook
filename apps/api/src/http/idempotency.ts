import {
  applyDecorators,
  BadRequestException,
  createParamDecorator,
  Injectable,
  type ExecutionContext,
  type PipeTransform,
} from "@nestjs/common";
import { ApiHeader } from "@nestjs/swagger";
import type { Request } from "express";

import { IDEMPOTENCY_KEY_HEADER, idempotencyKeyPattern } from "../api.constants.js";
import { ApiProblem } from "../contracts/api-error.js";

const idempotencyKeyConstructionToken = Symbol("IdempotencyKey construction token");

export class IdempotencyKey {
  readonly #value: string;

  private constructor(constructionToken: symbol, value: string) {
    if (constructionToken !== idempotencyKeyConstructionToken) {
      throw new BadRequestException("Idempotency key must be parsed at the API boundary.");
    }

    this.#value = value;
  }

  static parse(input: unknown): IdempotencyKey | undefined {
    if (typeof input !== "string") {
      return undefined;
    }

    const normalized = input.trim();
    return idempotencyKeyPattern.test(normalized)
      ? new IdempotencyKey(idempotencyKeyConstructionToken, normalized)
      : undefined;
  }

  toString(): string {
    return this.#value;
  }
}

@Injectable()
export class IdempotencyKeyPipe implements PipeTransform<unknown, IdempotencyKey> {
  transform(value: unknown): IdempotencyKey {
    const key = IdempotencyKey.parse(value);

    if (key === undefined) {
      throw ApiProblem.invalidIdempotencyKey();
    }

    return key;
  }
}

const rawIdempotencyKey = createParamDecorator(
  (_data: undefined, context: ExecutionContext): unknown => {
    const request = context.switchToHttp().getRequest<Request>();
    return request.header(IDEMPOTENCY_KEY_HEADER);
  },
);

export function IdempotencyKeyHeader(): ParameterDecorator {
  return rawIdempotencyKey(undefined, IdempotencyKeyPipe);
}

export function ApiIdempotencyKey(): MethodDecorator {
  return applyDecorators(
    ApiHeader({
      description: "Kunci unik 8-128 karakter untuk mendeduplikasi mutation yang aman diulang.",
      name: IDEMPOTENCY_KEY_HEADER,
      required: true,
      schema: {
        maxLength: 128,
        minLength: 8,
        pattern: idempotencyKeyPattern.source,
        type: "string",
      },
    }),
  );
}
