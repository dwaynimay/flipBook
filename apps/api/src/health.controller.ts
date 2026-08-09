import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

import { HealthReadinessDto } from "./contracts/health.js";
import { REQUEST_ID_HEADER } from "./api.constants.js";
import { ApiFoundationResponses } from "./http/openapi-decorators.js";

@ApiTags("system")
@Controller("health")
export class HealthController {
  @Get()
  @ApiOperation({ summary: "Readiness proses API" })
  @ApiOkResponse({
    headers: {
      [REQUEST_ID_HEADER]: {
        description: "ID korelasi stabil untuk respons dan pelacakan dukungan.",
        schema: { maxLength: 128, minLength: 1, type: "string" },
      },
    },
    type: HealthReadinessDto,
  })
  @ApiFoundationResponses()
  readiness(): HealthReadinessDto {
    return { service: "api", status: "ready" };
  }
}
