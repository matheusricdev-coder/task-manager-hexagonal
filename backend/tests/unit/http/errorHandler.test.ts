import { z } from "zod";
import { InvalidCredentialsException } from "../../../src/domain/errors/InvalidCredentialsException";
import { TaskNotFoundException } from "../../../src/domain/errors/TaskNotFoundException";
import { UnauthenticatedException } from "../../../src/domain/errors/UnauthenticatedException";
import { UnauthorizedTaskAccessException } from "../../../src/domain/errors/UnauthorizedTaskAccessException";
import { UserAlreadyExistsException } from "../../../src/domain/errors/UserAlreadyExistsException";
import { ValidationException } from "../../../src/domain/errors/ValidationException";
import { errorHandler } from "../../../src/infrastructure/http/middlewares/errorHandler";
import { mockNext, mockRequest, mockResponse } from "../../helpers/http";

describe("errorHandler — maps domain exceptions to HTTP status codes", () => {
  it("ZodError → 400 with code VALIDATION_ERROR and field details", () => {
    const schema = z.object({ email: z.string().email() });
    const result = schema.safeParse({ email: "x" });
    if (result.success) throw new Error("expected failure");

    const res = mockResponse();
    errorHandler(result.error, mockRequest(), res, mockNext());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: expect.objectContaining({
        code: "VALIDATION_ERROR",
        message: "Dados da requisição inválidos",
        details: expect.any(Object),
      }),
    });
  });

  it("ValidationException → 400 with provided details", () => {
    const res = mockResponse();
    errorHandler(
      new ValidationException("bad", { title: ["required"] }),
      mockRequest(),
      res,
      mockNext()
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: expect.objectContaining({
        code: "VALIDATION_ERROR",
        details: { title: ["required"] },
      }),
    });
  });

  it("ValidationException without details → 400 without details key", () => {
    const res = mockResponse();
    errorHandler(new ValidationException("bad"), mockRequest(), res, mockNext());

    expect(res.status).toHaveBeenCalledWith(400);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.error.code).toBe("VALIDATION_ERROR");
  });

  it("UnauthenticatedException → 401", () => {
    const res = mockResponse();
    errorHandler(new UnauthenticatedException(), mockRequest(), res, mockNext());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: expect.objectContaining({ code: "UNAUTHENTICATED" }),
    });
  });

  it("InvalidCredentialsException → 401", () => {
    const res = mockResponse();
    errorHandler(new InvalidCredentialsException(), mockRequest(), res, mockNext());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: expect.objectContaining({ code: "INVALID_CREDENTIALS" }),
    });
  });

  it("UnauthorizedTaskAccessException → 403", () => {
    const res = mockResponse();
    errorHandler(new UnauthorizedTaskAccessException(), mockRequest(), res, mockNext());

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: expect.objectContaining({ code: "UNAUTHORIZED_TASK_ACCESS" }),
    });
  });

  it("TaskNotFoundException → 404", () => {
    const res = mockResponse();
    errorHandler(new TaskNotFoundException("abc"), mockRequest(), res, mockNext());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: expect.objectContaining({ code: "TASK_NOT_FOUND" }),
    });
  });

  it("UserAlreadyExistsException → 409", () => {
    const res = mockResponse();
    errorHandler(
      new UserAlreadyExistsException("a@b.com"),
      mockRequest(),
      res,
      mockNext()
    );

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: expect.objectContaining({ code: "USER_ALREADY_EXISTS" }),
    });
  });
});

describe("errorHandler — fallback for unknown errors", () => {
  const originalEnv = process.env.NODE_ENV;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });

  it("plain Error → 500 with the raw message in development", () => {
    process.env.NODE_ENV = "development";
    const res = mockResponse();
    errorHandler(new Error("kaboom"), mockRequest(), res, mockNext());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: expect.objectContaining({
        code: "INTERNAL_SERVER_ERROR",
        message: "kaboom",
      }),
    });
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("plain Error → 500 with generic message in production (no info leak)", () => {
    process.env.NODE_ENV = "production";
    const res = mockResponse();
    errorHandler(new Error("internal secret"), mockRequest(), res, mockNext());

    expect(res.status).toHaveBeenCalledWith(500);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.error.message).toBe("Erro interno do servidor");
    expect(payload.error.message).not.toContain("secret");
  });

  it("non-Error thrown value → 500 (defensive)", () => {
    process.env.NODE_ENV = "development";
    const res = mockResponse();
    errorHandler("just a string", mockRequest(), res, mockNext());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: expect.objectContaining({
        code: "INTERNAL_SERVER_ERROR",
        message: "Unknown error",
      }),
    });
  });

  it("null thrown value → 500", () => {
    process.env.NODE_ENV = "development";
    const res = mockResponse();
    errorHandler(null, mockRequest(), res, mockNext());

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
