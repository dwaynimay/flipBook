import { Module } from "@nestjs/common";

import { HealthController } from "./health.controller.js";

@Module({
  controllers: [HealthController],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Nest requires a class token for module metadata.
export class AppModule {}
