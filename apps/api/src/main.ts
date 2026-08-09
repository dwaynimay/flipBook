import "reflect-metadata";

import { bootstrapApi } from "./bootstrap.js";
import { createApiApplication } from "./create-application.js";

await bootstrapApi({ createApplication: createApiApplication, port: process.env.PORT });
