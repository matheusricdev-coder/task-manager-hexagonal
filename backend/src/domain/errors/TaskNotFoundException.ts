import { DomainError } from "./DomainError";

export class TaskNotFoundException extends DomainError {
  public readonly code = "TASK_NOT_FOUND";
  public readonly httpStatus = 404;

  constructor(taskId: string) {
    super(`Tarefa com id "${taskId}" não encontrada`);
  }
}
