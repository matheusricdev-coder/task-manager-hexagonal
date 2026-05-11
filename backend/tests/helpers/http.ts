import { NextFunction, Request, Response } from "express";
import { AuthenticatedRequest } from "../../src/infrastructure/http/middlewares/authMiddleware";

export const mockResponse = (): jest.Mocked<Response> => {
  const res = {} as jest.Mocked<Response>;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

export const mockNext = (): jest.MockedFunction<NextFunction> =>
  jest.fn() as jest.MockedFunction<NextFunction>;

export const mockRequest = (
  overrides: Partial<Request> = {}
): Request => ({ body: {}, params: {}, query: {}, headers: {}, ...overrides } as Request);

export const mockAuthRequest = (
  overrides: Partial<AuthenticatedRequest> = {}
): AuthenticatedRequest =>
  ({
    body: {},
    params: {},
    query: {},
    headers: {},
    currentUser: { userId: "user-1", email: "alice@example.com" },
    ...overrides,
  } as AuthenticatedRequest);
