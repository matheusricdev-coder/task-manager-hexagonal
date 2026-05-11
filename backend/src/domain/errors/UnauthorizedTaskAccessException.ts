import { DomainError } from "./DomainError";

export class UnauthorizedTaskAccessException extends DomainError {
  public readonly code = "UNAUTHORIZED_TASK_ACCESS";
  public readonly httpStatus = 403;

  constructor() {
    super("Você não tem permissão para acessar esta tarefa");
  }
}
