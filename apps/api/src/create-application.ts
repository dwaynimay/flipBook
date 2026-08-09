import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";

import { AppModule } from "./app.module.js";
import { configureApplication } from "./configure-application.js";

export interface ApiApplicationCreationDependencies {
  readonly configure: (application: NestExpressApplication) => void;
  readonly create: () => Promise<NestExpressApplication>;
}

const defaultDependencies: ApiApplicationCreationDependencies = {
  configure: configureApplication,
  create: async () =>
    NestFactory.create<NestExpressApplication>(AppModule, {
      bodyParser: false,
      logger: false,
    }),
};

export async function createApiApplication(
  dependencies: ApiApplicationCreationDependencies = defaultDependencies,
): Promise<NestExpressApplication> {
  const application = await dependencies.create();

  try {
    dependencies.configure(application);
    return application;
  } catch (configurationError: unknown) {
    try {
      await application.close();
    } catch (closeError: unknown) {
      throw new AggregateError(
        [configurationError, closeError],
        "API application configuration failed and cleanup also failed.",
      );
    }

    throw configurationError;
  }
}
