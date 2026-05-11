import { Task, TaskPriority, TaskStatus } from "../../../domain/entities/Task";
import { TaskRepository } from "../../ports/repositories/TaskRepository";

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

export interface ListTasksInput {
  userId: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ListTasksOutput {
  data: Task[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export class ListTasksUseCase {
  constructor(private readonly taskRepository: TaskRepository) {}

  async execute(input: ListTasksInput): Promise<ListTasksOutput> {
    const page = Math.max(1, Math.floor(input.page ?? 1));
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Math.floor(input.pageSize ?? DEFAULT_PAGE_SIZE))
    );

    const result = await this.taskRepository.findManyByUser(
      input.userId,
      {
        status: input.status,
        priority: input.priority,
        search: input.search,
      },
      { page, pageSize }
    );

    return {
      data: result.items,
      pagination: {
        page,
        pageSize,
        total: result.total,
        totalPages: Math.max(1, Math.ceil(result.total / pageSize)),
      },
    };
  }
}
