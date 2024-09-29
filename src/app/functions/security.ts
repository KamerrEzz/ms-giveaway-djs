import { NextFunction, Request, Response } from "express";
import { api } from "../../utils/assets/env";
import boom from "@hapi/boom"

export default function (req: Request, res: Response, next: NextFunction) {

    const user = req.headers["account-user"];
    const password = req.headers["account-password"];

    if(!user || !password) return next(boom.unauthorized("Missing account-user or account-password header"));


    if (api.user === user && api.password === password) return next();

    return next(boom.unauthorized("Invalid account-user or account-password header"));
}