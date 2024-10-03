import { Giveaway } from "@prisma/client";
import Joi from "joi";

const GiveawayPost = Joi.object<Pick<Giveaway, "guild" | "channel" | "users" | "prize" | "delay" | "winnersCount" | "active" | "lang">>({
    guild: Joi.string().required(),
    channel: Joi.string().required(),
    users: Joi.array().items(Joi.string()).optional(),
    prize: Joi.string().required(),
    delay: Joi.number().required().tag("Segundos"),
    lang: Joi.string(), 
    winnersCount: Joi.number().required(),
    active: Joi.boolean().required(),
})

const GiveawayPut = Joi.object<Pick<Giveaway, "channel" | "users" | "prize" | "delay" | "winnersCount" | "active">>({
    channel: Joi.string().optional(),
    users: Joi.array().items(Joi.string()).optional(),
    prize: Joi.string().optional(),
    delay: Joi.number().optional(),
    winnersCount: Joi.number().optional(),
    active: Joi.boolean().optional(),
}).min(1)


export { GiveawayPost, GiveawayPut };