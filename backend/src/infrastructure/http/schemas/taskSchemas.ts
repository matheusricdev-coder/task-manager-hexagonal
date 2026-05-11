import { z } from "zod";
import { BULK_TASKS_LIMIT } from "../../../application/useCases/tasks/CreateTasksBulkUseCase";

export const taskStatusSchema = z.enum(["PENDING", "IN_PROGRESS", "DONE"]);
export const taskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);

const dueDateSchema = z
  .union([z.string().datetime(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()])
  .optional();

const taskItemSchema = z.object({
  title: z.string().min(1, "título é obrigatório").max(255),
  description: z.string().max(10_000).nullable().optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  dueDate: dueDateSchema,
});

export const createTaskBodySchema = z.union([
  taskItemSchema,
  z.object({
    tasks: z
      .array(taskItemSchema)
      .min(1, "a lista de tarefas deve conter pelo menos um item")
      .max(BULK_TASKS_LIMIT, `a lista de tarefas deve ter no máximo ${BULK_TASKS_LIMIT} itens`),
  }),
]);

export const updateTaskBodySchema = z
  .object({
    title: z.string().min(1).max(255).optional(),
    description: z.string().max(10_000).nullable().optional(),
    status: taskStatusSchema.optional(),
    priority: taskPrioritySchema.optional(),
    dueDate: dueDateSchema,
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "ao menos um campo deve ser fornecido",
  });

export const listTasksQuerySchema = z.object({
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  search: z.string().max(255).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const taskIdParamSchema = z.object({
  id: z.string().uuid("id da tarefa inválido"),
});

export type CreateTaskBody = z.infer<typeof createTaskBodySchema>;
export type UpdateTaskBody = z.infer<typeof updateTaskBodySchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;

export const parseDueDate = (
  value: string | null | undefined
): Date | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};
