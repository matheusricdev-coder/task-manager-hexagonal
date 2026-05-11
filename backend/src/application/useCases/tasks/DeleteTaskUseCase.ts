import { TaskNotFoundException } from "../../../domain/errors/TaskNotFoundException";
import { UnauthorizedTaskAccessException } from "../../../domain/errors/UnauthorizedTaskAccessException";
import { TaskRepository } from "../../ports/repositories/TaskRepository";

export interface DeleteTaskInput {
  taskId: string;
  userId: string;
}

export class DeleteTaskUseCase {
  constructor(private readonly taskRepository: TaskRepository) {}

  async execute(input: DeleteTaskInput): Promise<void> {
    const existing = await this.taskRepository.findById(input.taskId);
    if (!existing) {
      throw new TaskNotFoundException(input.taskId);
    }
    if (existing.userId !== input.userId) {
      throw new UnauthorizedTaskAccessException();
    }

    await this.taskRepository.delete(input.taskId);
  }
}
