import { RequestHandler, Router } from "express";
import { TaskController } from "../controllers/TaskController";
import { asyncHandler } from "../middlewares/asyncHandler";

export const buildTaskRouter = (
  controller: TaskController,
  authMiddleware: RequestHandler
): Router => {
  const router = Router();
  router.use(authMiddleware);
  router.post("/", asyncHandler(controller.create));
  router.get("/", asyncHandler(controller.list));
  router.get("/:id", asyncHandler(controller.getById));
  router.patch("/:id", asyncHandler(controller.update));
  router.delete("/:id", asyncHandler(controller.remove));
  router.post("/:id/timer/start", asyncHandler(controller.startTimer));
  router.post("/:id/timer/stop", asyncHandler(controller.stopTimer));
  return router;
};
