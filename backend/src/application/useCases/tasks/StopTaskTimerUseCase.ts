import { Task } from "../../../domain/entities/Task";
import { TaskNotFoundException } from "../../../domain/errors/TaskNotFoundException";
import { UnauthorizedTaskAccessException } from "../../../domain/errors/UnauthorizedTaskAccessException";
import { TaskRepository } from "../../ports/repositories/TaskRepository";

export interface StopTaskTimerInput {
  taskId: string;
  userId: string;
  now?: Date;
}

export class StopTaskTimerUseCase {
  constructor(private readonly taskRepository: TaskRepository) {}

  async execute(input: StopTaskTimerInput): Promise<Task> {
    const task = await this.taskRepository.findById(input.taskId);
    if (!task) throw new TaskNotFoundException(input.taskId);
    if (task.userId !== input.userId) throw new UnauthorizedTaskAccessException();
    if (!task.timerStartedAt) return task;

    const now = input.now ?? new Date();
    const elapsedSeconds = Math.max(
      0,
      Math.floor((now.getTime() - task.timerStartedAt.getTime()) / 1000)
    );

    return this.taskRepository.update(input.taskId, {
      timerStartedAt: null,
      timeSpentSeconds: task.timeSpentSeconds + elapsedSeconds,
    });
  }
}
