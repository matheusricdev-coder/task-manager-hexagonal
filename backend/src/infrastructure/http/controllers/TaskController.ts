import { Response } from "express";
import { CreateTaskUseCase } from "../../../application/useCases/tasks/CreateTaskUseCase";
import { CreateTasksBulkUseCase } from "../../../application/useCases/tasks/CreateTasksBulkUseCase";
import { DeleteTaskUseCase } from "../../../application/useCases/tasks/DeleteTaskUseCase";
import { GetTaskByIdUseCase } from "../../../application/useCases/tasks/GetTaskByIdUseCase";
import { ListTasksUseCase } from "../../../application/useCases/tasks/ListTasksUseCase";
import { StartTaskTimerUseCase } from "../../../application/useCases/tasks/StartTaskTimerUseCase";
import { StopTaskTimerUseCase } from "../../../application/useCases/tasks/StopTaskTimerUseCase";
import { UpdateTaskUseCase } from "../../../application/useCases/tasks/UpdateTaskUseCase";
import { UnauthenticatedException } from "../../../domain/errors/UnauthenticatedException";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import {
  createTaskBodySchema,
  listTasksQuerySchema,
  parseDueDate,
  taskIdParamSchema,
  updateTaskBodySchema,
} from "../schemas/taskSchemas";

export class TaskController {
  constructor(
    private readonly createTaskUseCase: CreateTaskUseCase,
    private readonly createTasksBulkUseCase: CreateTasksBulkUseCase,
    private readonly listTasksUseCase: ListTasksUseCase,
    private readonly getTaskByIdUseCase: GetTaskByIdUseCase,
    private readonly updateTaskUseCase: UpdateTaskUseCase,
    private readonly deleteTaskUseCase: DeleteTaskUseCase,
    private readonly startTaskTimerUseCase: StartTaskTimerUseCase,
    private readonly stopTaskTimerUseCase: StopTaskTimerUseCase
  ) {}

  private requireUserId(req: AuthenticatedRequest): string {
    const userId = req.currentUser?.userId;
    if (!userId) throw new UnauthenticatedException();
    return userId;
  }

  create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.requireUserId(req);
    const body = createTaskBodySchema.parse(req.body);

    if ("tasks" in body) {
      const result = await this.createTasksBulkUseCase.execute({
        tasks: body.tasks.map((t) => ({
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          dueDate: parseDueDate(t.dueDate ?? undefined) ?? null,
        })),
        userId,
      });
      res.status(201).json(result);
      return;
    }

    const task = await this.createTaskUseCase.execute({
      title: body.title,
      description: body.description ?? null,
      status: body.status,
      priority: body.priority,
      dueDate: parseDueDate(body.dueDate ?? undefined) ?? null,
      userId,
    });
    res.status(201).json(task);
  };

  list = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.requireUserId(req);
    const query = listTasksQuerySchema.parse(req.query);
    const tasks = await this.listTasksUseCase.execute({ userId, ...query });
    res.status(200).json(tasks);
  };

  getById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.requireUserId(req);
    const { id } = taskIdParamSchema.parse(req.params);
    const task = await this.getTaskByIdUseCase.execute({ taskId: id, userId });
    res.status(200).json(task);
  };

  update = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.requireUserId(req);
    const { id } = taskIdParamSchema.parse(req.params);
    const body = updateTaskBodySchema.parse(req.body);
    const task = await this.updateTaskUseCase.execute({
      taskId: id,
      userId,
      title: body.title,
      description: body.description,
      status: body.status,
      priority: body.priority,
      dueDate: parseDueDate(body.dueDate),
    });
    res.status(200).json(task);
  };

  remove = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.requireUserId(req);
    const { id } = taskIdParamSchema.parse(req.params);
    await this.deleteTaskUseCase.execute({ taskId: id, userId });
    res.status(204).send();
  };

  startTimer = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = this.requireUserId(req);
    const { id } = taskIdParamSchema.parse(req.params);
    const task = await this.startTaskTimerUseCase.execute({ taskId: id, userId });
    res.status(200).json(task);
  };

  stopTimer = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = this.requireUserId(req);
    const { id } = taskIdParamSchema.parse(req.params);
    const task = await this.stopTaskTimerUseCase.execute({ taskId: id, userId });
    res.status(200).json(task);
  };
}
