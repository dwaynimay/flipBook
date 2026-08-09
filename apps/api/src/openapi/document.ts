import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from "@nestjs/swagger";

import { IDEMPOTENCY_KEY_HEADER, idempotencyKeyPattern } from "../api.constants.js";
import { ApiErrorDetailDto, ApiErrorDto, ApiErrorEnvelopeDto } from "../contracts/api-error.js";
import { HealthReadinessDto } from "../contracts/health.js";
import { createApiApplication } from "../create-application.js";

function addReusableComponents(document: OpenAPIObject): OpenAPIObject {
  const schemas = document.components?.schemas ?? {};

  return {
    ...document,
    components: {
      ...document.components,
      headers: {
        ...document.components?.headers,
        RequestId: {
          description: "ID korelasi stabil untuk respons dan pelacakan dukungan.",
          schema: { maxLength: 128, minLength: 1, type: "string" },
        },
      },
      parameters: {
        ...document.components?.parameters,
        IdempotencyKey: {
          description: "Kunci unik 8-128 karakter untuk mendeduplikasi mutation yang aman diulang.",
          in: "header",
          name: IDEMPOTENCY_KEY_HEADER,
          required: true,
          schema: {
            maxLength: 128,
            minLength: 8,
            pattern: idempotencyKeyPattern.source,
            type: "string",
          },
        },
      },
      schemas,
    },
  };
}

export async function createOpenApiDocument(): Promise<OpenAPIObject> {
  const application = await createApiApplication();

  try {
    const configuration = new DocumentBuilder()
      .setTitle("Interactive Digital Booklet Learning Platform API")
      .setDescription("Kontrak REST JSON untuk learner dan admin applications.")
      .setVersion("1.0.0")
      .build();

    const document = SwaggerModule.createDocument(application, configuration, {
      extraModels: [ApiErrorDetailDto, ApiErrorDto, ApiErrorEnvelopeDto, HealthReadinessDto],
      operationIdFactory: (controllerKey: string, methodKey: string) =>
        `${controllerKey}_${methodKey}`,
    });

    return addReusableComponents(document);
  } finally {
    await application.close();
  }
}

export function compareCodeUnitStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue);
  }

  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => compareCodeUnitStrings(left, right))
        .map(([key, child]) => [key, sortJsonValue(child)]),
    );
  }

  return value;
}

export function serializeOpenApiDocument(document: OpenAPIObject): string {
  return `${JSON.stringify(sortJsonValue(document), undefined, 2)}\n`;
}
