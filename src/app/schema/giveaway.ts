import { Giveaway } from "@prisma/client";
import Joi from "joi";

const GiveawayPost = Joi.object<Pick<Giveaway, "guild" | "channel" | "users" | "prize" | "endTime" | "winnersCount" | "active">>({
    guild: Joi.string().required(),
    channel: Joi.string().required(),
    users: Joi.array().items(Joi.string()).optional(),
    prize: Joi.string().required(),
    endTime: Joi.date().required(),
    winnersCount: Joi.number().required(),
    active: Joi.boolean().required(),
})

const GiveawayPut = Joi.object<Pick<Giveaway, "channel" | "users" | "prize" | "endTime" | "winnersCount" | "active">>({
    channel: Joi.string().optional(),
    users: Joi.array().items(Joi.string()).optional(),
    prize: Joi.string().optional(),
    endTime: Joi.date().optional(),
    winnersCount: Joi.number().optional(),
    active: Joi.boolean().optional(),
}).min(1)


export { GiveawayPost, GiveawayPut };