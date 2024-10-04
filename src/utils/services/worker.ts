import { Worker } from "bullmq";
import { prisma } from "../../prismaClient";
import giveaway from "../../app/functions/giveaway";
import { Giveaway } from "@prisma/client";
import logger from "./logger";
import redis from "./redis";

export default new Worker<Giveaway>("giveawey", async (job) => {
    const { id } = job.data;

    const giveawa = await prisma.giveaway.findUnique({
        where: { id },
    });

    if (giveawa && giveawa.active) {
        await giveaway.finish(id);
    }
}, {
    connection:redis
}).on('completed', (job) => {
    logger.infoWithType("Giveaway", `Completado ${job.id}`);
}).on("error", (err)=>{
    logger.errorWithType("Giveaway", err.message)
}).on("ready", ()=>{
    logger.infoWithType("Giveaway", `Listo`)
}).on('failed', (job, err) => {
    logger.errorWithType("Giveaway", `Fallo ${job?.id} ${err}`)
});