import { PrismaClient, Prisma } from "@prisma/client";
import { Task } from "../../../domain/entities/Task";
import {
  CreateTaskInput,
  ListTasksFilters,
  ListTasksPagination,
  PaginatedTasks,
  TaskRepository,
  UpdateTaskInput,
} from "../../../application/ports/repositories/TaskRepository";

export class PrismaTaskRepository implements TaskRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateTaskInput): Promise<Task> {
    return this.prisma.task.create({ data });
  }

  async createMany(data: CreateTaskInput[]): Promise<number> {
    const result = await this.prisma.task.createMany({ data });
    return result.count;
  }

  async findById(id: string): Promise<Task | null> {
    return this.prisma.task.findUnique({ where: { id } });
  }

  async findManyByUser(
    userId: string,
    filters?: ListTasksFilters,
    pagination?: ListTasksPagination
  ): Promise<PaginatedTasks> {
    const where: Prisma.TaskWhereInput = { userId };
    if (filters?.status) where.status = filters.status;
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    const findArgs: Prisma.TaskFindManyArgs = {
      where,
      orderBy: [{ createdAt: "desc" }],
    };
    if (pagination) {
      findArgs.skip = (pagination.page - 1) * pagination.pageSize;
      findArgs.take = pagination.pageSize;
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.task.findMany(findArgs),
      this.prisma.task.count({ where }),
    ]);
    return { items, total };
  }

  async update(id: string, data: UpdateTaskInput): Promise<Task> {
    const updateData: Prisma.TaskUpdateInput = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
    if (data.timeSpentSeconds !== undefined)
      updateData.timeSpentSeconds = data.timeSpentSeconds;
    if (data.timerStartedAt !== undefined)
      updateData.timerStartedAt = data.timerStartedAt;
    return this.prisma.task.update({ where: { id }, data: updateData });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.task.delete({ where: { id } });
  }
}
