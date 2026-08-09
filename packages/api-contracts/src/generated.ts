export interface paths {
  readonly "/api/v1/health": {
    readonly parameters: {
      readonly query?: never;
      readonly header?: never;
      readonly path?: never;
      readonly cookie?: never;
    };
    /** Readiness proses API */
    readonly get: operations["HealthController_readiness"];
    readonly put?: never;
    readonly post?: never;
    readonly delete?: never;
    readonly options?: never;
    readonly head?: never;
    readonly patch?: never;
    readonly trace?: never;
  };
}
export type webhooks = Record<string, never>;
export interface components {
  schemas: {
    readonly ApiErrorDetailDto: {
      /** @example title */
      readonly field: string;
      /**
       * @example length_out_of_range
       * @enum {string}
       */
      readonly reason: "invalid_value" | "length_out_of_range" | "must_be_string" | "unknown_field";
    };
    readonly ApiErrorDto: {
      /**
       * @example VALIDATION_FAILED
       * @enum {string}
       */
      readonly code:
        | "BAD_REQUEST"
        | "CONFLICT"
        | "FORBIDDEN"
        | "INTERNAL_ERROR"
        | "INVALID_IDEMPOTENCY_KEY"
        | "NOT_FOUND"
        | "RATE_LIMITED"
        | "UNAUTHORIZED"
        | "VALIDATION_FAILED";
      readonly details?: readonly components["schemas"]["ApiErrorDetailDto"][];
      /** @example Periksa kembali data yang dikirim. */
      readonly message: string;
      /** @example ad7c22c2-8ed1-4df2-bb46-38bc930ecb67 */
      readonly requestId: string;
    };
    readonly ApiErrorEnvelopeDto: {
      readonly error: components["schemas"]["ApiErrorDto"];
    };
    readonly HealthReadinessDto: {
      /**
       * @example api
       * @enum {string}
       */
      readonly service: "api";
      /**
       * @example ready
       * @enum {string}
       */
      readonly status: "ready";
    };
  };
  responses: never;
  parameters: {
    /** @description Kunci unik 8-128 karakter untuk mendeduplikasi mutation yang aman diulang. */
    readonly IdempotencyKey: string;
  };
  requestBodies: never;
  headers: {
    /** @description ID korelasi stabil untuk respons dan pelacakan dukungan. */
    readonly RequestId: string;
  };
  pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
  readonly HealthController_readiness: {
    readonly parameters: {
      readonly query?: never;
      readonly header?: never;
      readonly path?: never;
      readonly cookie?: never;
    };
    readonly requestBody?: never;
    readonly responses: {
      readonly 200: {
        headers: {
          /** @description ID korelasi stabil untuk respons dan pelacakan dukungan. */
          readonly "X-Request-Id"?: string;
          readonly [name: string]: unknown;
        };
        content: {
          readonly "application/json": components["schemas"]["HealthReadinessDto"];
        };
      };
      /** @description Kegagalan internal tanpa kebocoran detail implementasi. */
      readonly 500: {
        headers: {
          /** @description ID korelasi yang sama dengan error.requestId. */
          readonly "X-Request-Id"?: string;
          readonly [name: string]: unknown;
        };
        content: {
          readonly "application/json": components["schemas"]["ApiErrorEnvelopeDto"];
        };
      };
    };
  };
}
