import { NextFunction, Request, Response } from "express";
import { web } from "../../utils/assets/env";
import boom from "@hapi/boom"

export default function (req: Request, res: Response, next: NextFunction) {
    const token = req.headers["account-token"];
    
    if(!token) return next(boom.unauthorized("Missing account-token header"));
    if(token !== web.token) return next(boom.unauthorized("Invalid account-token header"));

    return next();
}