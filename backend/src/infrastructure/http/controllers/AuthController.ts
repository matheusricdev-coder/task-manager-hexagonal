import { Request, Response } from "express";
import { GetCurrentUserUseCase } from "../../../application/useCases/auth/GetCurrentUserUseCase";
import { LoginUserUseCase } from "../../../application/useCases/auth/LoginUserUseCase";
import { RegisterUserUseCase } from "../../../application/useCases/auth/RegisterUserUseCase";
import { UnauthenticatedException } from "../../../domain/errors/UnauthenticatedException";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { loginSchema, registerSchema } from "../schemas/authSchemas";

export class AuthController {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly loginUserUseCase: LoginUserUseCase,
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase
  ) {}

  register = async (req: Request, res: Response): Promise<void> => {
    const dto = registerSchema.parse(req.body);
    const result = await this.registerUserUseCase.execute(dto);
    res.status(201).json(result);
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const dto = loginSchema.parse(req.body);
    const result = await this.loginUserUseCase.execute(dto);
    res.status(200).json(result);
  };

  me = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.currentUser?.userId;
    if (!userId) throw new UnauthenticatedException();
    const user = await this.getCurrentUserUseCase.execute(userId);
    res.status(200).json(user);
  };
}
