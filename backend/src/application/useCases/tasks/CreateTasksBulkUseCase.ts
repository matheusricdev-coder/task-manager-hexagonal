import { TaskPriority, TaskStatus } from "../../../domain/entities/Task";
import { ValidationException } from "../../../domain/errors/ValidationException";
import { TaskRepository } from "../../ports/repositories/TaskRepository";

export const BULK_TASKS_LIMIT = 1000;

export interface BulkTaskItem {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date | null;
}

export interface CreateTasksBulkInput {
  tasks: BulkTaskItem[];
  userId: string;
}

export interface CreateTasksBulkOutput {
  created: number;
}

export class CreateTasksBulkUseCase {
  constructor(private readonly taskRepository: TaskRepository) {}

  async execute(input: CreateTasksBulkInput): Promise<CreateTasksBulkOutput> {
    if (input.tasks.length === 0) {
      throw new ValidationException("a lista de tarefas deve conter pelo menos um item");
    }
    if (input.tasks.length > BULK_TASKS_LIMIT) {
      throw new ValidationException(
        `a lista de tarefas excede o limite máximo de ${BULK_TASKS_LIMIT}`
      );
    }

    const created = await this.taskRepository.createMany(
      input.tasks.map((t) => ({
        title: t.title,
        description: t.description ?? null,
        status: t.status ?? "PENDING",
        priority: t.priority ?? "MEDIUM",
        dueDate: t.dueDate ?? null,
        userId: input.userId,
      }))
    );

    return { created };
  }
}
