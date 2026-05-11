import { Task } from "../../../domain/entities/Task";
import { TaskNotFoundException } from "../../../domain/errors/TaskNotFoundException";
import { UnauthorizedTaskAccessException } from "../../../domain/errors/UnauthorizedTaskAccessException";
import { TaskRepository } from "../../ports/repositories/TaskRepository";

export interface StartTaskTimerInput {
  taskId: string;
  userId: string;
  now?: Date;
}

export class StartTaskTimerUseCase {
  constructor(private readonly taskRepository: TaskRepository) {}

  async execute(input: StartTaskTimerInput): Promise<Task> {
    const task = await this.taskRepository.findById(input.taskId);
    if (!task) throw new TaskNotFoundException(input.taskId);
    if (task.userId !== input.userId) throw new UnauthorizedTaskAccessException();
    if (task.timerStartedAt) return task;

    const now = input.now ?? new Date();
    return this.taskRepository.update(input.taskId, {
      timerStartedAt: now,
      status: task.status === "PENDING" ? "IN_PROGRESS" : task.status,
    });
  }
}
