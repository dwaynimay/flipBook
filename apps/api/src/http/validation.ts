import { ValidationPipe } from "@nestjs/common";
import type { ValidationError } from "class-validator";

import {
  ApiProblem,
  MAX_PUBLIC_ERROR_DETAILS,
  type ApiErrorDetail,
  type ApiErrorDetailReason,
} from "../contracts/api-error.js";

const publicValidationReasons: Readonly<Record<string, ApiErrorDetailReason>> = {
  isLength: "length_out_of_range",
  isString: "must_be_string",
  whitelistValidation: "unknown_field",
};

function publicValidationReason(constraint: string): ApiErrorDetailReason {
  return publicValidationReasons[constraint] ?? "invalid_value";
}

function safeFieldSegment(input: string): string {
  return /^[A-Za-z0-9_-]{1,64}$/.test(input) ? input : "request";
}

function collectValidationDetails(
  errors: readonly ValidationError[],
  parentPath = "",
  details: ApiErrorDetail[] = [],
): readonly ApiErrorDetail[] {
  for (const error of errors) {
    if (details.length >= MAX_PUBLIC_ERROR_DETAILS) {
      break;
    }

    const segment = safeFieldSegment(error.property);
    const field = parentPath.length === 0 ? segment : `${parentPath}.${segment}`;
    const constraints = error.constraints;
    if (constraints !== undefined) {
      for (const constraint in constraints) {
        if (!Object.hasOwn(constraints, constraint)) {
          continue;
        }
        details.push({ field, reason: publicValidationReason(constraint) });
        if (details.length >= MAX_PUBLIC_ERROR_DETAILS) {
          break;
        }
      }
    }

    if (details.length < MAX_PUBLIC_ERROR_DETAILS && error.children !== undefined) {
      collectValidationDetails(error.children, field, details);
    }
  }

  return details;
}

export function createApiValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    exceptionFactory: (errors: ValidationError[]) =>
      ApiProblem.validationFailed(collectValidationDetails(errors)),
    forbidNonWhitelisted: true,
    transform: true,
    whitelist: true,
  });
}
