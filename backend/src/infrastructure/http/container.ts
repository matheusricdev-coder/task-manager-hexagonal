import { PrismaClient } from "@prisma/client";
import { GetCurrentUserUseCase } from "../../application/useCases/auth/GetCurrentUserUseCase";
import { LoginUserUseCase } from "../../application/useCases/auth/LoginUserUseCase";
import { RegisterUserUseCase } from "../../application/useCases/auth/RegisterUserUseCase";
import { CreateTaskUseCase } from "../../application/useCases/tasks/CreateTaskUseCase";
import { CreateTasksBulkUseCase } from "../../application/useCases/tasks/CreateTasksBulkUseCase";
import { DeleteTaskUseCase } from "../../application/useCases/tasks/DeleteTaskUseCase";
import { GetTaskByIdUseCase } from "../../application/useCases/tasks/GetTaskByIdUseCase";
import { ListTasksUseCase } from "../../application/useCases/tasks/ListTasksUseCase";
import { StartTaskTimerUseCase } from "../../application/useCases/tasks/StartTaskTimerUseCase";
import { StopTaskTimerUseCase } from "../../application/useCases/tasks/StopTaskTimerUseCase";
import { UpdateTaskUseCase } from "../../application/useCases/tasks/UpdateTaskUseCase";
import { PrismaTaskRepository } from "../database/repositories/PrismaTaskRepository";
import { PrismaUserRepository } from "../database/repositories/PrismaUserRepository";
import { BcryptHashService } from "../security/BcryptHashService";
import { JwtTokenService } from "../security/JwtTokenService";
import { AuthController } from "./controllers/AuthController";
import { TaskController } from "./controllers/TaskController";
import { makeAuthMiddleware } from "./middlewares/authMiddleware";

export interface Container {
  authController: AuthController;
  taskController: TaskController;
  authMiddleware: ReturnType<typeof makeAuthMiddleware>;
}

export interface ContainerConfig {
  prisma: PrismaClient;
  jwtSecret: string;
  jwtExpiresIn: string;
  bcryptSaltRounds: number;
}

export const buildContainer = (config: ContainerConfig): Container => {
  const userRepository = new PrismaUserRepository(config.prisma);
  const taskRepository = new PrismaTaskRepository(config.prisma);

  const hashService = new BcryptHashService(config.bcryptSaltRounds);
  const tokenService = new JwtTokenService(config.jwtSecret, config.jwtExpiresIn);

  const registerUserUseCase = new RegisterUserUseCase(
    userRepository,
    hashService,
    tokenService
  );
  const loginUserUseCase = new LoginUserUseCase(
    userRepository,
    hashService,
    tokenService
  );
  const getCurrentUserUseCase = new GetCurrentUserUseCase(userRepository);

  const createTaskUseCase = new CreateTaskUseCase(taskRepository);
  const createTasksBulkUseCase = new CreateTasksBulkUseCase(taskRepository);
  const listTasksUseCase = new ListTasksUseCase(taskRepository);
  const getTaskByIdUseCase = new GetTaskByIdUseCase(taskRepository);
  const updateTaskUseCase = new UpdateTaskUseCase(taskRepository);
  const deleteTaskUseCase = new DeleteTaskUseCase(taskRepository);
  const startTaskTimerUseCase = new StartTaskTimerUseCase(taskRepository);
  const stopTaskTimerUseCase = new StopTaskTimerUseCase(taskRepository);

  const authController = new AuthController(
    registerUserUseCase,
    loginUserUseCase,
    getCurrentUserUseCase
  );
  const taskController = new TaskController(
    createTaskUseCase,
    createTasksBulkUseCase,
    listTasksUseCase,
    getTaskByIdUseCase,
    updateTaskUseCase,
    deleteTaskUseCase,
    startTaskTimerUseCase,
    stopTaskTimerUseCase
  );

  const authMiddleware = makeAuthMiddleware(tokenService);

  return { authController, taskController, authMiddleware };
};
