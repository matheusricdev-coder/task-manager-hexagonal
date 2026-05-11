import { RequestHandler, Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { asyncHandler } from "../middlewares/asyncHandler";

export const buildAuthRouter = (
  controller: AuthController,
  authMiddleware: RequestHandler
): Router => {
  const router = Router();
  router.post("/register", asyncHandler(controller.register));
  router.post("/login", asyncHandler(controller.login));
  router.get("/me", authMiddleware, asyncHandler(controller.me));
  return router;
};
