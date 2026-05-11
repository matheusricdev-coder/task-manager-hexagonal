import { Task, TaskPriority, TaskStatus } from "../../../domain/entities/Task";

export interface CreateTaskInput {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date | null;
  userId: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date | null;
  timeSpentSeconds?: number;
  timerStartedAt?: Date | null;
}

export interface ListTasksFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  search?: string;
}

export interface ListTasksPagination {
  page: number;
  pageSize: number;
}

export interface PaginatedTasks {
  items: Task[];
  total: number;
}

export interface TaskRepository {
  create(data: CreateTaskInput): Promise<Task>;
  createMany(data: CreateTaskInput[]): Promise<number>;
  findById(id: string): Promise<Task | null>;
  findManyByUser(
    userId: string,
    filters?: ListTasksFilters,
    pagination?: ListTasksPagination
  ): Promise<PaginatedTasks>;
  update(id: string, data: UpdateTaskInput): Promise<Task>;
  delete(id: string): Promise<void>;
}
