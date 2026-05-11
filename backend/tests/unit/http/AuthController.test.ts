import { ZodError } from "zod";
import { GetCurrentUserUseCase } from "../../../src/application/useCases/auth/GetCurrentUserUseCase";
import { LoginUserUseCase } from "../../../src/application/useCases/auth/LoginUserUseCase";
import { RegisterUserUseCase } from "../../../src/application/useCases/auth/RegisterUserUseCase";
import { InvalidCredentialsException } from "../../../src/domain/errors/InvalidCredentialsException";
import { UnauthenticatedException } from "../../../src/domain/errors/UnauthenticatedException";
import { UserAlreadyExistsException } from "../../../src/domain/errors/UserAlreadyExistsException";
import { AuthController } from "../../../src/infrastructure/http/controllers/AuthController";
import { mockAuthRequest, mockRequest, mockResponse } from "../../helpers/http";

describe("AuthController", () => {
  const setup = () => {
    const registerUseCase = { execute: jest.fn() } as unknown as jest.Mocked<RegisterUserUseCase>;
    const loginUseCase = { execute: jest.fn() } as unknown as jest.Mocked<LoginUserUseCase>;
    const getCurrentUserUseCase = { execute: jest.fn() } as unknown as jest.Mocked<GetCurrentUserUseCase>;
    const controller = new AuthController(registerUseCase, loginUseCase, getCurrentUserUseCase);
    return { controller, registerUseCase, loginUseCase, getCurrentUserUseCase };
  };

  describe("register — happy path", () => {
    it("returns 201 with user and token on success", async () => {
      const { controller, registerUseCase } = setup();
      registerUseCase.execute.mockResolvedValue({
        user: { id: "u1", email: "a@b.com", name: "A", createdAt: new Date(), updatedAt: new Date() },
        token: "jwt",
      });
      const req = mockRequest({ body: { email: "a@b.com", name: "A", password: "12345678" } });
      const res = mockResponse();

      await controller.register(req, res);

      expect(registerUseCase.execute).toHaveBeenCalledWith({
        email: "a@b.com",
        name: "A",
        password: "12345678",
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: "jwt" }));
    });
  });

  describe("register — invalid input → ZodError", () => {
    const cases: Array<[string, Record<string, unknown>]> = [
      ["missing email", { name: "A", password: "12345678" }],
      ["missing name", { email: "a@b.com", password: "12345678" }],
      ["missing password", { email: "a@b.com", name: "A" }],
      ["empty body", {}],
      ["invalid email format", { email: "not-an-email", name: "A", password: "12345678" }],
      ["password too short (7 chars)", { email: "a@b.com", name: "A", password: "1234567" }],
      ["empty name", { email: "a@b.com", name: "", password: "12345678" }],
      ["non-string email", { email: 123, name: "A", password: "12345678" }],
      ["null password", { email: "a@b.com", name: "A", password: null }],
    ];

    test.each(cases)("rejects %s", async (_label, body) => {
      const { controller } = setup();
      const req = mockRequest({ body });
      const res = mockResponse();

      await expect(controller.register(req, res)).rejects.toBeInstanceOf(ZodError);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("register — domain errors propagate unchanged", () => {
    it("propagates UserAlreadyExistsException", async () => {
      const { controller, registerUseCase } = setup();
      registerUseCase.execute.mockRejectedValue(new UserAlreadyExistsException("a@b.com"));
      const req = mockRequest({ body: { email: "a@b.com", name: "A", password: "12345678" } });
      const res = mockResponse();

      await expect(controller.register(req, res)).rejects.toBeInstanceOf(UserAlreadyExistsException);
    });
  });

  describe("login — happy path", () => {
    it("returns 200 with token on success", async () => {
      const { controller, loginUseCase } = setup();
      loginUseCase.execute.mockResolvedValue({
        user: { id: "u1", email: "a@b.com", name: "A", createdAt: new Date(), updatedAt: new Date() },
        token: "jwt",
      });
      const req = mockRequest({ body: { email: "a@b.com", password: "12345678" } });
      const res = mockResponse();

      await controller.login(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: "jwt" }));
    });
  });

  describe("login — invalid input → ZodError", () => {
    const cases: Array<[string, Record<string, unknown>]> = [
      ["missing email", { password: "12345678" }],
      ["missing password", { email: "a@b.com" }],
      ["invalid email format", { email: "bad", password: "12345678" }],
      ["empty password string", { email: "a@b.com", password: "" }],
      ["empty body", {}],
    ];

    test.each(cases)("rejects %s", async (_label, body) => {
      const { controller } = setup();
      const req = mockRequest({ body });
      const res = mockResponse();

      await expect(controller.login(req, res)).rejects.toBeInstanceOf(ZodError);
    });
  });

  describe("login — domain errors propagate", () => {
    it("propagates InvalidCredentialsException", async () => {
      const { controller, loginUseCase } = setup();
      loginUseCase.execute.mockRejectedValue(new InvalidCredentialsException());
      const req = mockRequest({ body: { email: "a@b.com", password: "12345678" } });
      const res = mockResponse();

      await expect(controller.login(req, res)).rejects.toBeInstanceOf(InvalidCredentialsException);
    });
  });

  describe("me", () => {
    it("returns the current user from the token payload", async () => {
      const { controller, getCurrentUserUseCase } = setup();
      const publicUser = {
        id: "u1",
        email: "a@b.com",
        name: "A",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      getCurrentUserUseCase.execute.mockResolvedValue(publicUser);

      const req = mockAuthRequest();
      const res = mockResponse();
      await controller.me(req, res);

      expect(getCurrentUserUseCase.execute).toHaveBeenCalledWith("user-1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(publicUser);
    });

    it("throws UnauthenticatedException when middleware did not attach currentUser (defense in depth)", async () => {
      const { controller } = setup();
      const req = mockAuthRequest({ currentUser: undefined });
      const res = mockResponse();

      await expect(controller.me(req, res)).rejects.toBeInstanceOf(UnauthenticatedException);
    });

    it("propagates UnauthenticatedException from use case (invalid session)", async () => {
      const { controller, getCurrentUserUseCase } = setup();
      getCurrentUserUseCase.execute.mockRejectedValue(new UnauthenticatedException("Sessão inválida"));

      const req = mockAuthRequest();
      const res = mockResponse();
      await expect(controller.me(req, res)).rejects.toBeInstanceOf(UnauthenticatedException);
    });
  });
});
