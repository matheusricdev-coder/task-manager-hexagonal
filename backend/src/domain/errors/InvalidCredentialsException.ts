import { DomainError } from "./DomainError";

export class InvalidCredentialsException extends DomainError {
  public readonly code = "INVALID_CREDENTIALS";
  public readonly httpStatus = 401;

  constructor() {
    super("E-mail ou senha inválidos");
  }
}
