import { Giveaway } from "@prisma/client";
import { Queue } from "bullmq";

import logger from "./logger";
import redis from "./redis";

export default new Queue<Giveaway>("giveawey", { connection: redis } ).on("error", (err)=>{
    logger.errorWithType("GiveawayQueue", err.message)
});