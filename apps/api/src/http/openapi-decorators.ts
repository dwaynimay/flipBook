import { applyDecorators } from "@nestjs/common";
import { ApiInternalServerErrorResponse } from "@nestjs/swagger";

import { REQUEST_ID_HEADER } from "../api.constants.js";
import { ApiErrorEnvelopeDto } from "../contracts/api-error.js";

export function ApiFoundationResponses(): MethodDecorator {
  return applyDecorators(
    ApiInternalServerErrorResponse({
      description: "Kegagalan internal tanpa kebocoran detail implementasi.",
      headers: {
        [REQUEST_ID_HEADER]: {
          description: "ID korelasi yang sama dengan error.requestId.",
          schema: { maxLength: 128, minLength: 1, type: "string" },
        },
      },
      type: ApiErrorEnvelopeDto,
    }),
  );
}
