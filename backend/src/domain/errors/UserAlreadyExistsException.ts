import { DomainError } from "./DomainError";

export class UserAlreadyExistsException extends DomainError {
  public readonly code = "USER_ALREADY_EXISTS";
  public readonly httpStatus = 409;

  constructor(email: string) {
    super(`Já existe um usuário com o e-mail "${email}"`);
  }
}
