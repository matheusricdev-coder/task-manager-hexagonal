import { Request, Response } from "express";
import { asyncHandler } from "../../../src/infrastructure/http/middlewares/asyncHandler";
import { mockNext, mockRequest, mockResponse } from "../../helpers/http";

describe("asyncHandler", () => {
  it("invokes the wrapped async handler", async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    const wrapped = asyncHandler(handler);
    const req = mockRequest();
    const res = mockResponse();
    const next = mockNext();

    await wrapped(req, res, next);

    expect(handler).toHaveBeenCalledWith(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });

  it("forwards thrown errors from async handlers to next()", async () => {
    const err = new Error("boom");
    const handler = jest.fn().mockRejectedValue(err);
    const wrapped = asyncHandler(handler);
    const req = mockRequest();
    const res = mockResponse();
    const next = mockNext();

    wrapped(req, res, next);
    await new Promise((r) => setImmediate(r));

    expect(next).toHaveBeenCalledWith(err);
  });

  it("forwards thrown errors from synchronous handlers to next()", async () => {
    const err = new Error("sync boom");
    const handler = jest.fn(() => {
      throw err;
    });
    const wrapped = asyncHandler(handler);
    const req = mockRequest();
    const res = mockResponse();
    const next = mockNext();

    wrapped(req, res, next);
    await new Promise((r) => setImmediate(r));

    expect(next).toHaveBeenCalledWith(err);
  });

  it("passes when handler returns synchronously without throwing", async () => {
    const handler = jest.fn(() => undefined);
    const wrapped = asyncHandler(handler);
    const req = mockRequest();
    const res = mockResponse();
    const next = mockNext();

    wrapped(req as Request, res as Response, next);
    await new Promise((r) => setImmediate(r));

    expect(handler).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
