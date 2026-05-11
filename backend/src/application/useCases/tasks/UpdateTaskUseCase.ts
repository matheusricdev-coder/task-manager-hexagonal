import { Task, TaskPriority, TaskStatus } from "../../../domain/entities/Task";
import { TaskNotFoundException } from "../../../domain/errors/TaskNotFoundException";
import { UnauthorizedTaskAccessException } from "../../../domain/errors/UnauthorizedTaskAccessException";
import { TaskRepository } from "../../ports/repositories/TaskRepository";

export interface UpdateTaskInput {
  taskId: string;
  userId: string;
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date | null;
}

export class UpdateTaskUseCase {
  constructor(private readonly taskRepository: TaskRepository) {}

  async execute(input: UpdateTaskInput): Promise<Task> {
    const existing = await this.taskRepository.findById(input.taskId);
    if (!existing) {
      throw new TaskNotFoundException(input.taskId);
    }
    if (existing.userId !== input.userId) {
      throw new UnauthorizedTaskAccessException();
    }

    return this.taskRepository.update(input.taskId, {
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      dueDate: input.dueDate,
    });
  }
}
