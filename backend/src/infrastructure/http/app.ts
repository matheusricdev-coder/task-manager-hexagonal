import cors from "cors";
import express, { Application } from "express";
import { Container } from "./container";
import { asyncHandler } from "./middlewares/asyncHandler";
import { errorHandler } from "./middlewares/errorHandler";
import { sanitizeMiddleware } from "./middlewares/sanitizeMiddleware";
import { buildAuthRouter } from "./routes/authRoutes";
import { buildTaskRouter } from "./routes/taskRoutes";

export const buildApp = (container: Container): Application => {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "5mb" }));
  app.use(sanitizeMiddleware);

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  const auth = asyncHandler(container.authMiddleware);
  app.use("/auth", buildAuthRouter(container.authController, auth));
  app.use("/tasks", buildTaskRouter(container.taskController, auth));

  app.use(errorHandler);

  return app;
};
