import { NextFunction, Request, Response } from "express";
import { prisma } from "../../prismaClient";
import giveawayQueue from "../../utils/services/giveawayQueue";
import { Giveaway as Give } from "@prisma/client"
import axios from "../../utils/services/axios";
import logger from "../../utils/services/logger";

export default new class Giveaway {

    async get(req: Request, res: Response) {
        const { id } = req.params
        const { active } = req.query
        try {
            const guild = await prisma.giveaway.findMany({
                where: { guild: id, active: Boolean(active) },
            });

            if (!guild) {
                res.status(404).json({ error: "Servidor no encontrado" });
            }

            res.status(200).json(guild);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Error al obtener el servidor" });
        }
    }

    async post(req: Request, res: Response, next: NextFunction) {
        const { channel, users, prize, endTime, guild, winnersCount } = req.body;

        const time = new Date(endTime);

        try {
            const giveaway = await prisma.giveaway.create({
                data: {
                    channel,
                    users,
                    prize,
                    endTime: time,
                    guild,
                    active: true,
                    winnersCount
                },
            });

            await giveawayQueue.add(
                "giveaway",
                giveaway,
                { delay: time.getTime() - Date.now(), removeOnComplete: true }
            );

            res.status(200).json({ message: "Sorteo creado", giveaway });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Error al crear el sorteo" });
        }
    }

    async end(req: Request, res: Response) {
        const { id } = req.params;

        try {
            const giveaway = await prisma.giveaway.findUnique({
                where: { id: parseInt(id) },
            });

            if (!giveaway || !giveaway.active) {
                res
                .status(404)
                .json({ error: "Sorteo no encontrado o ya finalizado" });
                return;
            }

            await this.finish(giveaway.id);

            const job = await giveawayQueue.getJob(id.toString());
            if (job) {
                await job.remove();
            }

            res.status(200).json({ message: "Sorteo finalizado manualmente" });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Error al finalizar el sorteo" });
            return;
        }
    }

    async put(req: Request<{id: string}, any,Partial<Give>>, res: Response){
        const { id } = req.params;
        let { channel, users, prize, guild, winnersCount } = req.body;

        try {
            
        } catch (error) {
            
        }
    }

    async finish(id: number) {
        const giveaway = await prisma.giveaway.findUnique({
            where: { id },
        });

        if (giveaway && giveaway.active) {
            const winner = this.getWinners(giveaway)


            await prisma.giveaway.update({
                where: { id },
                data: { active: false, winners: winner },
            });

            const winners = winner.map(w => `<@${w}>`)

            const msg = `El ganador del sorteo es ${winners.join()}, has ganado \`${giveaway.prize}\` !!`

            try {
                await axios.post(`channels/${giveaway.channel}/messages`, JSON.stringify({ content: msg }));
            } catch (error) {
                if (error instanceof Error) {
                    logger.errorWithType("Axios", error.stack || error.message);
                }
            }
        }
    }

    private getWinners(giveaway: Give) {
        const winners = [];
        const usersCopy = [...giveaway.users];

        for (let i = 0; i < giveaway.winnersCount; i++) {
            if (usersCopy.length === 0) break;

            const randomIndex = Math.floor(Math.random() * usersCopy.length);
            winners.push(usersCopy[randomIndex]);
            usersCopy.splice(randomIndex, 1);
        }

        return winners;
    }
}()