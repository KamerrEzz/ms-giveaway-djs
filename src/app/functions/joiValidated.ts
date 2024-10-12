import { NextFunction, Request, Response } from "express";
import Joi from "joi";

export default function (type: "params" | "body" | "query", schema: Joi.AnySchema) {
    return (req: Request, res: Response, next: NextFunction) => {
        const data = req[type];

        // Validar que se haya proporcionado el dato
        if (!data) {
            res.status(400).json({ error: `No ${type} provided` });
            return;
        }

        // Validar los datos contra el esquema
        const { error } = schema.validate(data, { abortEarly: false });

        if (error) {
            res.status(400).json({
                action: 'Error',
                message: error.details.map((x)=>x.message)
            });
            return;
        }

        // Si la validación es exitosa, continuar
        next();
    };
}
