import { parseApiPort } from "./runtime-config.js";

export interface ApiBootstrapApplication {
  close(): Promise<void>;
  listen(port: number, hostname: string): Promise<unknown>;
}

export interface ApiBootstrapDependencies {
  readonly createApplication: () => Promise<ApiBootstrapApplication>;
  readonly port: unknown;
}

export async function bootstrapApi(
  dependencies: ApiBootstrapDependencies,
): Promise<ApiBootstrapApplication> {
  const port = parseApiPort(dependencies.port);
  const application = await dependencies.createApplication();

  try {
    await application.listen(port, "127.0.0.1");
    return application;
  } catch (listenError: unknown) {
    try {
      await application.close();
    } catch (closeError: unknown) {
      throw new AggregateError(
        [listenError, closeError],
        "API startup failed and application cleanup also failed.",
      );
    }

    throw listenError;
  }
}
