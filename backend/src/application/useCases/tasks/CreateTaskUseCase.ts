import { Task, TaskPriority, TaskStatus } from "../../../domain/entities/Task";
import { TaskRepository } from "../../ports/repositories/TaskRepository";

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date | null;
  userId: string;
}

export class CreateTaskUseCase {
  constructor(private readonly taskRepository: TaskRepository) {}

  async execute(input: CreateTaskInput): Promise<Task> {
    return this.taskRepository.create({
      title: input.title,
      description: input.description ?? null,
      status: input.status ?? "PENDING",
      priority: input.priority ?? "MEDIUM",
      dueDate: input.dueDate ?? null,
      userId: input.userId,
    });
  }
}
