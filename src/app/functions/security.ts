import { NextFunction, Request, Response } from "express";
import { web } from "../../utils/assets/env";
import boom from "@hapi/boom";

export default function (req: Request, res: Response, next: NextFunction) {
    const token = req.header("account-token");
    
    try {
        if (!token) {
            res.status(401).json(boom.unauthorized("Missing account-token header").output);
            return
        }
    
        // Verifica si el token es válido
        if (token !== web.token) {
            res.status(401).json(boom.unauthorized("Invalid account-token header").output);
            return
        }
    } catch (error) {
        res.status(500).json(boom.internal("Internal server error").output);
    }


    // Si el token es válido, llama a next()
    next();
}