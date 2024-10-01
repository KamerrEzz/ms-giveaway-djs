import { Worker } from "bullmq";
import { redis as connection } from "../assets/env";
import { prisma } from "../../prismaClient";
import giveaway from "../../app/functions/giveaway";
import { Giveaway } from "@prisma/client";

const worker = new Worker<Giveaway>("giveawey", async (job) => {
    const { id } = job.data;

    const giveawa = await prisma.giveaway.findUnique({
        where: { id },
    });

    if (giveawa && giveawa.active) {
        await giveaway.finish(id);
    }
}, {
    connection
})

worker.on('completed', (job) => {
    console.log(`Completado ${job.id}`);
})

worker.on('failed', (job, err) => {
    console.log(`Fallo ${job?.id}`, err)
})

export default worker;