import { describe, expect, it, vi } from "vitest";

import { bootstrapApi, type ApiBootstrapApplication } from "../src/bootstrap.js";
import { ApiRuntimeConfigError } from "../src/runtime-config.js";

function applicationWith(
  listen: ApiBootstrapApplication["listen"],
  close: ApiBootstrapApplication["close"],
): ApiBootstrapApplication {
  return { close, listen };
}

describe("API bootstrap lifecycle", () => {
  it("validates configuration before creating the Nest application", async () => {
    const createApplication = vi.fn<() => Promise<ApiBootstrapApplication>>();

    await expect(bootstrapApi({ createApplication, port: "3000x" })).rejects.toBeInstanceOf(
      ApiRuntimeConfigError,
    );
    expect(createApplication).not.toHaveBeenCalled();
  });

  it("closes exactly once and preserves the listen failure", async () => {
    const listenError = new Error("listen failed");
    const listen = vi.fn<ApiBootstrapApplication["listen"]>().mockRejectedValue(listenError);
    const close = vi.fn<ApiBootstrapApplication["close"]>().mockResolvedValue(undefined);
    const application = applicationWith(listen, close);

    await expect(
      bootstrapApi({ createApplication: async () => application, port: "3000" }),
    ).rejects.toBe(listenError);
    expect(listen).toHaveBeenCalledWith(3000, "127.0.0.1");
    expect(close).toHaveBeenCalledOnce();
  });

  it("keeps a successfully listening application open", async () => {
    const listen = vi.fn<ApiBootstrapApplication["listen"]>().mockResolvedValue(undefined);
    const close = vi.fn<ApiBootstrapApplication["close"]>().mockResolvedValue(undefined);
    const application = applicationWith(listen, close);

    await expect(
      bootstrapApi({ createApplication: async () => application, port: undefined }),
    ).resolves.toBe(application);
    expect(listen).toHaveBeenCalledWith(3000, "127.0.0.1");
    expect(close).not.toHaveBeenCalled();
  });
});
