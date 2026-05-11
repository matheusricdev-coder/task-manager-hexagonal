import { UnauthenticatedException } from "../../../src/domain/errors/UnauthenticatedException";
import { makeAuthMiddleware } from "../../../src/infrastructure/http/middlewares/authMiddleware";
import { makeTokenServiceMock } from "../../helpers/mocks";
import { mockAuthRequest, mockNext, mockResponse } from "../../helpers/http";

describe("authMiddleware", () => {
  it("attaches currentUser when token is valid", () => {
    const tokenService = makeTokenServiceMock();
    tokenService.verify.mockReturnValue({ userId: "u1", email: "a@b.com" });
    const middleware = makeAuthMiddleware(tokenService);
    const req = mockAuthRequest({
      headers: { authorization: "Bearer some.jwt.token" },
      currentUser: undefined,
    });
    const res = mockResponse();
    const next = mockNext();

    middleware(req, res, next);

    expect(tokenService.verify).toHaveBeenCalledWith("some.jwt.token");
    expect(req.currentUser).toEqual({ userId: "u1", email: "a@b.com" });
    expect(next).toHaveBeenCalledWith();
  });

  it("trims whitespace around the token", () => {
    const tokenService = makeTokenServiceMock();
    tokenService.verify.mockReturnValue({ userId: "u1", email: "a@b.com" });
    const middleware = makeAuthMiddleware(tokenService);
    const req = mockAuthRequest({
      headers: { authorization: "Bearer    padded.token   " },
      currentUser: undefined,
    });
    const res = mockResponse();
    const next = mockNext();

    middleware(req, res, next);

    expect(tokenService.verify).toHaveBeenCalledWith("padded.token");
  });

  it("throws UnauthenticatedException when header is missing", () => {
    const tokenService = makeTokenServiceMock();
    const middleware = makeAuthMiddleware(tokenService);
    const req = mockAuthRequest({ headers: {}, currentUser: undefined });
    const res = mockResponse();
    const next = mockNext();

    expect(() => middleware(req, res, next)).toThrow(UnauthenticatedException);
    expect(next).not.toHaveBeenCalled();
    expect(tokenService.verify).not.toHaveBeenCalled();
  });

  it("throws when scheme is not Bearer", () => {
    const tokenService = makeTokenServiceMock();
    const middleware = makeAuthMiddleware(tokenService);
    const req = mockAuthRequest({
      headers: { authorization: "Basic xyz" },
      currentUser: undefined,
    });

    expect(() => middleware(req, mockResponse(), mockNext())).toThrow(
      UnauthenticatedException
    );
    expect(tokenService.verify).not.toHaveBeenCalled();
  });

  it("throws when Bearer is followed by only whitespace (empty token)", () => {
    const tokenService = makeTokenServiceMock();
    const middleware = makeAuthMiddleware(tokenService);
    const req = mockAuthRequest({
      headers: { authorization: "Bearer    " },
      currentUser: undefined,
    });

    expect(() => middleware(req, mockResponse(), mockNext())).toThrow(
      UnauthenticatedException
    );
    expect(tokenService.verify).not.toHaveBeenCalled();
  });

  it("propagates UnauthenticatedException thrown by TokenService.verify", () => {
    const tokenService = makeTokenServiceMock();
    tokenService.verify.mockImplementation(() => {
      throw new UnauthenticatedException("Token inválido ou expirado");
    });
    const middleware = makeAuthMiddleware(tokenService);
    const req = mockAuthRequest({
      headers: { authorization: "Bearer expired.token" },
      currentUser: undefined,
    });

    expect(() => middleware(req, mockResponse(), mockNext())).toThrow(
      UnauthenticatedException
    );
  });

  it("never attaches a partial currentUser when verify fails", () => {
    const tokenService = makeTokenServiceMock();
    tokenService.verify.mockImplementation(() => {
      throw new UnauthenticatedException();
    });
    const middleware = makeAuthMiddleware(tokenService);
    const req = mockAuthRequest({
      headers: { authorization: "Bearer x" },
      currentUser: undefined,
    });

    try {
      middleware(req, mockResponse(), mockNext());
    } catch {
      // expected
    }
    expect(req.currentUser).toBeUndefined();
  });
});
