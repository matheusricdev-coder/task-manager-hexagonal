import { DomainError } from "./DomainError";

export class ValidationException extends DomainError {
  public readonly code = "VALIDATION_ERROR";
  public readonly httpStatus = 400;
  public readonly details: Record<string, string[]> | undefined;

  constructor(message: string, details?: Record<string, string[]>) {
    super(message);
    this.details = details;
  }
}
