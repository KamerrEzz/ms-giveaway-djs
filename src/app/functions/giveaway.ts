import { NextFunction, Request, Response } from "express";
import { prisma } from "../../prismaClient";
import giveawayQueue from "../../utils/services/giveawayQueue";
import { Giveaway as Give } from "@prisma/client"
import logger from "../../utils/services/logger";
import i18n from "../../utils/services/i18n";
import Message, { actionRow, button, embed } from "../../utils/functions/Message";
import { ButtonStyle } from "discord-api-types/v10";

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
            let giveaway = await prisma.giveaway.create({
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


            const message = await Message.create(channel, {
                embeds: [
                    embed(
                        prize,
                        await EmbedDescription({
                            count: winnersCount,
                            delay,
                            lang,
                        }),
                        0x2f3136
                    )
                ],
                components: [
                    actionRow(
                        button(
                            `giveaway.join-{{${giveaway.id}}}`,
                            ButtonStyle.Primary,
                            undefined,
                            "🎉"
                        )
                    )
                ]
            });

            if (!message) {
                res.status(400).json({ error: "No se pudo crear el mensaje" });
                return;
            };

            giveaway = await prisma.giveaway.update({
                where: { id: giveaway.id },
                data: { message: message.id },
            })

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

    async join(req: Request, res: Response) {
        const { id } = req.params;
        const body = req.body;

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
            let users = giveaway.users || [];
            let action = users.includes(body.user) ? 'Already' : 'Success';
            let message = action === 'Already' ? 'El usuario ya existe' : 'Usuario agregado';
            if (action === 'Success') {
                users.push(body.user);
            } else {
                res.status(400).json({ action, message })
            }

            await prisma.giveaway.update({
                where: { id: parseInt(id) },
                data: { users },
            });

            res.status(200).json({
                action,
                message,
                users,
            });
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

            if (!giveaway || !giveaway.end) {
                res.status(404).json({ error: "Sorteo no encontrado o no finalizado" });
                return
            };

            const winners = this.getWinners(giveaway);

            if (!winners) {
                res.status(200).json({ action: "NO_WINNERS_COMPLET", message: "No hubo usuarios necesarios para el sorteo", winners })
                return;
            }

            await prisma.giveaway.update({
                where: { id: parseInt(id) },
                data: { winners }
            });

            const msg = await i18n(giveaway.lang.split("_").join("-"), "end", {
                winners: winners.join(", "),
                prize: giveaway.prize
            });

            try {
                if (giveaway.message) await Message.create(giveaway.channel, {
                    content: msg, message_reference: {
                        message_id: giveaway.message,
                        fail_if_not_exists: false,
                        channel_id: giveaway.channel,
                        guild_id: giveaway.guild
                    }
                });

                if (giveaway.message) await Message.edit(giveaway.channel, giveaway.message, {
                    embeds: [
                        embed(
                            giveaway.prize,
                            await EmbedDescription({
                                winners: winners.join(", "),
                                delay: giveaway.delay,
                                lang: giveaway.lang,
                            }, true),
                            0x2f3136
                        )
                    ],
                })
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
            res
                .status(500)
                .json({ error: "Error al re-rollear el sorteo" })
        }
    }

    async finish(id: number) {
        const giveaway = await prisma.giveaway.findUnique({
            where: { id },
        });

        if (giveaway && giveaway.active) {
            const winner = this.getWinners(giveaway)

            if (!winner) {
                await Message.create(giveaway.channel, {
                    content: await i18n(giveaway.lang.split("_").join("-"), "noWinners")
                })
                return
            }

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
                if (giveaway.message) await Message.create(giveaway.channel, {
                    content: msg, message_reference: {
                        message_id: giveaway.message,
                        fail_if_not_exists: false,
                        channel_id: giveaway.channel,
                        guild_id: giveaway.guild
                    }
                });
                if (giveaway.message) await Message.edit(giveaway.channel, giveaway.message, {
                    embeds: [
                        embed(
                            giveaway.prize,
                            await EmbedDescription({
                                winners: winners.join(", "),
                                delay: giveaway.delay,
                                lang: giveaway.lang,
                            }, true),
                            0x2f3136
                        )
                    ],
                })
            } catch (error) {
                if (error instanceof Error) {
                    logger.errorWithType("Axios", error.stack || error.message);
                }
            }
        }
    };

    async guild(req: Request, res: Response) {
        const { id } = req.params;
        const { active, limit } = req.query;

        try {
            const giveaways = await prisma.giveaway.findMany({
                where: { guild: id, active: Boolean(active) },
                take: limit ? parseInt(limit as string) : 10
            });

            res.status(200).json(giveaways)
        } catch (error) {
            res.status(500).json({ error: "Error al obtener los sorteos" })
        }
    };


    private getWinners(giveaway: Give) {
        const usersGiveaway: string[] = giveaway.users;
        const winnersCount = giveaway.winnersCount;
        let winnersSet = new Set<string>();
        if (winnersCount > 0 && usersGiveaway.length >= winnersCount) {
            const shuffledUsers = [...usersGiveaway].sort(() => 0.5 - Math.random());
            for (let user of shuffledUsers) {
                winnersSet.add(user);
                if (winnersSet.size === winnersCount) {
                    break;
                }
            }
            while (winnersSet.size < winnersCount) {
                const randomUser = usersGiveaway[Math.floor(Math.random() * usersGiveaway.length)];
                winnersSet.add(randomUser);
            }

            const winners = Array.from(winnersSet);
            return winners;
        } else {
            return false;
        }
    }

}()

async function EmbedDescription(data: {
    lang: string,
    delay: number,
    count?: number,
    winners?: string,
}, winners: boolean = false) {
    const lang = data.lang.split("_").join("-");
    try {
        let text = await i18n(lang, "embed.description", data);
        text += await i18n(lang, "embed.winners", { winners: (winners ? data?.winners : data.count?.toString()) || "" });

        return text
    } catch (e) {
        return undefined
    }
}