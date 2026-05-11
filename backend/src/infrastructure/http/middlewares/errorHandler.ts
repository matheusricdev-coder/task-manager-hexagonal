import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { DomainError } from "../../../domain/errors/DomainError";

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Dados da requisição inválidos",
        details: err.flatten().fieldErrors,
      },
    });
    return;
  }

  if (err instanceof DomainError) {
    res.status(err.httpStatus).json({
      error: {
        code: err.code,
        message: err.message,
        ...("details" in err && err.details
          ? { details: (err as { details: unknown }).details }
          : {}),
      },
    });
    return;
  }

  const message = err instanceof Error ? err.message : "Unknown error";
  // eslint-disable-next-line no-console
  console.error("[UnhandledError]", err);

  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message:
        process.env.NODE_ENV === "production"
          ? "Erro interno do servidor"
          : message,
    },
  });
};
