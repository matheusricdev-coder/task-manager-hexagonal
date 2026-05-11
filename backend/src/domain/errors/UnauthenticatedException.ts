import { DomainError } from "./DomainError";

export class UnauthenticatedException extends DomainError {
  public readonly code = "UNAUTHENTICATED";
  public readonly httpStatus = 401;

  constructor(message = "Autenticação necessária") {
    super(message);
  }
}
