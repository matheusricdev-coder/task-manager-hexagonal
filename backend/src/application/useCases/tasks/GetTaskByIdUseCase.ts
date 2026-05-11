import { Task } from "../../../domain/entities/Task";
import { TaskNotFoundException } from "../../../domain/errors/TaskNotFoundException";
import { UnauthorizedTaskAccessException } from "../../../domain/errors/UnauthorizedTaskAccessException";
import { TaskRepository } from "../../ports/repositories/TaskRepository";

export interface GetTaskByIdInput {
  taskId: string;
  userId: string;
}

export class GetTaskByIdUseCase {
  constructor(private readonly taskRepository: TaskRepository) {}

  async execute(input: GetTaskByIdInput): Promise<Task> {
    const task = await this.taskRepository.findById(input.taskId);
    if (!task) {
      throw new TaskNotFoundException(input.taskId);
    }
    if (task.userId !== input.userId) {
      throw new UnauthorizedTaskAccessException();
    }
    return task;
  }
}
