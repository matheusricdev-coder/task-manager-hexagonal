import { env } from "./infrastructure/config/env";
import { prisma } from "./infrastructure/database/prisma";
import { buildApp } from "./infrastructure/http/app";
import { buildContainer } from "./infrastructure/http/container";

const container = buildContainer({
  prisma,
  jwtSecret: env.jwtSecret,
  jwtExpiresIn: env.jwtExpiresIn,
  bcryptSaltRounds: env.bcryptSaltRounds,
});

const app = buildApp(container);

const server = app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${env.port}`);
});

const shutdown = async (signal: string): Promise<void> => {
  // eslint-disable-next-line no-console
  console.log(`Received ${signal}, shutting down...`);
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
