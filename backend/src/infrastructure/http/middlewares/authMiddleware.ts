import { NextFunction, Request, Response } from "express";
import { TokenService } from "../../../application/ports/services/TokenService";
import { UnauthenticatedException } from "../../../domain/errors/UnauthenticatedException";

export interface AuthenticatedRequest extends Request {
  currentUser?: { userId: string; email: string };
}

export const makeAuthMiddleware =
  (tokenService: TokenService) =>
  (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      throw new UnauthenticatedException("Token não fornecido");
    }
    const token = header.slice("Bearer ".length).trim();
    if (!token) {
      throw new UnauthenticatedException("Token não fornecido");
    }
    const payload = tokenService.verify(token);
    req.currentUser = payload;
    next();
  };
