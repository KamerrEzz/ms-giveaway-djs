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

            const job = await giveawayQueue.getJob(id);
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
                    active: true,
                    paused: true,
                    delay: (job?.delay || 0) - Date.now()
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

    async Valid(req: Request, res: Response) {
        const { id } = req.params;
        const body = req.body as string | string[];
    
        try {
            const giveaway = await prisma.giveaway.findUnique({
                where: { id: parseInt(id) },
            });
    
            if (!giveaway) {
                res.status(404).json({ action: "NotFound", message: "Sorteo no encontrado" });
                return
            }
    
            if (!giveaway.active) {
                res.status(404).json({ action: "Ended", message: "Sorteo finalizado" });
                return
            }
    
            if (giveaway.paused) {
                res.status(404).json({ action: "Paused", message: "Sorteo pausado" });
                return
            }
    
            // Verificar si ya participa
            if (typeof body === "string" && giveaway.users.includes(body)) {
                res.status(400).json({ action: "Already", message: "Ya estás participando" });
                return
            }
    
            if (Array.isArray(body) && body.every(user => giveaway.users.includes(user))) {
                res.status(400).json({ action: "Already", message: "Todos los usuarios ya están participando" });
                return
            }
    
            // Filtrar usuarios duplicados y agregar nuevos
            const users = giveaway.users
                .filter((x) => {
                    if (typeof body === "string") return x !== body;
                    if (Array.isArray(body)) return !body.includes(x);
                })
                .concat(typeof body === "string" ? [body] : body);
    
            await prisma.giveaway.update({
                where: { id: parseInt(id) },
                data: { users },
            });
    
            res.status(200).json({ action: "Success", message: "Participación registrada" });
        } catch (error) {
            console.error(error);  // Log error for debugging
            res.status(500).json({ action: "Error", message: "Error al registrar la participación" });
        }
    }
    
    async reRoll(req: Request, res: Response) {
        const { id } = req.params;

        try {
            const giveaway = await prisma.giveaway.findUnique({
                where: { id: parseInt(id) }
            });

            if(!giveaway || !giveaway.end) {
                res.status(404).json({ error: "Sorteo no encontrado o no finalizado" });
                return
            };

        const winners = this.getWinners(giveaway);

        await prisma.giveaway.update({
            where: { id: parseInt(id) },
            data: { winners }
        });

        const msg = await i18n(giveaway.lang.split("_").join("-"), "end", {
            winners: winners.join(", "),
            prize: giveaway.prize
        });

        try {
            await this.sendMessage(giveaway.channel, msg)
        } catch (error) {
            if (error instanceof Error) {
                logger.errorWithType("Axios", error.stack || error.message);
                res
                .status(500)
                .json({ error: "Error al enviar el mensaje de sorteo" })
                return
            }
        }

        res.status(200).json({ message: "Sorteo re-rolleado", winners })
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