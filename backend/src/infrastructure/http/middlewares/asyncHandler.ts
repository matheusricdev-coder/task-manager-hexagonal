import { NextFunction, Request, RequestHandler, Response } from "express";

export const asyncHandler =
  <Req extends Request = Request>(
    fn: (req: Req, res: Response, next: NextFunction) => Promise<unknown> | unknown
  ): RequestHandler =>
  (req, res, next) => {
    Promise.resolve()
      .then(() => fn(req as Req, res, next))
      .catch(next);
  };
