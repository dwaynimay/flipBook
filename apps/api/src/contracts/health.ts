import { ApiProperty } from "@nestjs/swagger";

export class HealthReadinessDto {
  @ApiProperty({ enum: ["ready"], example: "ready" })
  readonly status!: "ready";

  @ApiProperty({ enum: ["api"], example: "api" })
  readonly service!: "api";
}
