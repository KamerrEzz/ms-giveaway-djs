import { NextFunction, Request, Response } from "express";
import { prisma } from "../../prismaClient";
import giveawayQueue from "../../utils/services/giveawayQueue";
import { Giveaway as Give } from "@prisma/client"
import axios from "../../utils/services/axios";
import logger from "../../utils/services/logger";
import i18n from "../../utils/services/i18n";

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
        const { channel, users, prize, delay, guild, winnersCount, lang } = req.body;


        try {
            const giveaway = await prisma.giveaway.create({
                data: {
                    channel,
                    users,
                    prize,
                    delay,
                    lang,
                    guild,
                    active: true,
                    winnersCount
                },
            });

            await giveawayQueue.add(
                "giveaway",
                giveaway,
                { delay: 1000 * delay, removeOnComplete: true }
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

    async put(req: Request<{ id: string }, any, Partial<Give>>, res: Response) {
        const { id } = req.params;
        let { channel, users, prize, guild, winnersCount } = req.body;

        try {
            const giveaway = await prisma.giveaway.findUnique({
                where: { id: parseInt(id) },
            });
            if (!giveaway || !giveaway.active) {
                res
                    .status(404)
                    .json({ error: "Sorteo no encontrado o ya finalizado" })
            }

            await prisma.giveaway.update({
                where: { id: parseInt(id) },
                data: { channel, users, prize, guild, winnersCount }
            })

            res.status(200).json({ message: "Sorteo actualizado" })
        } catch (error) {
            res
                .status(500)
                .json({ error: "Error al actualizar el sorteo" })
        }
    }

    async pause(req: Request, res: Response) {
        const { id } = req.params;

        try {
            const giveaway = await prisma.giveaway.findUnique({
                where: { id: parseInt(id) },
            });

            if (!giveaway || !giveaway.active) {
                res
                    .status(404)
                    .json({ error: "Sorteo no encontrado o ya finalizado" })
            }

            const job = await giveawayQueue.getJob(id);
            if (job) await job.remove();

            await prisma.giveaway.update({
                where: { id: parseInt(id) },
                data: {
                    active: false,
                    paused: true
                }
            });

            res.status(200).json({ message: "Sorteo pausado" })
        } catch (error) {
            res
                .status(500)
                .json({ error: "Error al pausar el sorteo" })
        }
    }

    async reOpen(req: Request, res: Response) {
        const { id } = req.params;

        try {
            const giveaway = await prisma.giveaway.findUnique({
                where: { id: parseInt(id) }
            });

            if (!giveaway || !giveaway.paused || !giveaway.active) {
                res
                    .status(404)
                    .json({ error: "Sorteo no encontrado o no pausado" })
                return;
            }

            await prisma.giveaway.update({
                where: { id: parseInt(id) },
                data: { paused: false }
            })

            giveawayQueue.add("giveaway", giveaway, { delay: Number(giveaway.delay), removeOnComplete: true });

            res.status(200).json({ message: "Sorteo reabierto" })
        } catch (error) {
            res
                .status(500)
                .json({ error: "Error al reabrir el sorteo" })
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
                data: { active: false, winners: winner, end: true },
            });

            const winners = winner.map(w => `<@${w}>`)


            const msg = await i18n(giveaway.lang.split("_").join("-"), "end", {
                winners: winners.join(", "),
                prize: giveaway.prize
            });

            try {
                await this.sendMessage(giveaway.channel, msg)
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

    private sendMessage(channel: string, message: string) {
        return axios.post(`channels/${channel}/messages`, JSON.stringify({ content: message }));
    }
}()