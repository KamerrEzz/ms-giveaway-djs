import { NextFunction, Request, Response } from "express";
import { prisma } from "../../prismaClient";
import giveawayQueue from "../../utils/services/giveawayQueue";
import { Giveaway as Give } from "@prisma/client"
import logger from "../../utils/services/logger";
import i18n from "../../utils/services/i18n";
import Message, { actionRow, button, embed } from "../../utils/functions/Message";
import { ButtonStyle } from "discord-api-types/v10";
import { discordButtonFormat } from "../../utils/assets/env";

const give = new class Giveaway {

    async get(req: Request, res: Response) {
        const id = ValidNumber(req.params.id)

        if (!id) {
            res.status(400).json({ error: "El id debe ser un número" });
            return;
        }

        try {
            const guild = await prisma.giveaway.findFirst({
                where: { id: id },
            });

            if (!guild) {
                res.status(404).json({ error: "Servidor no encontrado" });
                return
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
                            winners: winnersCount,
                            delay: Math.floor((Date.now() + (delay * 1000)) / 1000),
                            lang,
                            entries: users?.length || 0,
                            id: giveaway.id
                        }),
                        "#002d9e"
                    )
                ],
                components: [
                    actionRow(
                        button(
                            `giveaway.join${discordButtonFormat(giveaway.id.toString())}`,
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
        const id = ValidNumber(req.params.id);
        if (!id) {
            res.status(400).json({ error: "El id debe ser un número" });
            return;
        }
        try {
            const giveaway = await prisma.giveaway.findUnique({
                where: { id },
            });

            if (!giveaway || !giveaway.active) {
                res
                    .status(404)
                    .json({ error: "Sorteo no encontrado o ya finalizado" });
                return;
            }

            await give.finish(giveaway.id);

            const job = await giveawayQueue.getJob(String(id));
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
        const id = ValidNumber(req.params.id);
        let { channel, users, prize, guild, winnersCount } = req.body;

        if (!id) {
            res.status(400).json({ error: "El id debe ser un número" });
            return;
        }

        try {
            const giveaway = await prisma.giveaway.findUnique({
                where: { id },
            });
            if (!giveaway || !giveaway.active) {
                res
                    .status(404)
                    .json({ error: "Sorteo no encontrado o ya finalizado" })
            }

            await prisma.giveaway.update({
                where: { id },
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
        const id = ValidNumber(req.params.id);

        if (!id) {
            res.status(400).json({ error: "El id debe ser un número" });
            return;
        }
        try {
            const giveaway = await prisma.giveaway.findUnique({
                where: { id },
            });

            if (!giveaway || !giveaway.active) {
                res
                    .status(404)
                    .json({ error: "Sorteo no encontrado o ya finalizado" })
            }

            const job = await giveawayQueue.getJob(String(id));
            if (job) await job.remove();

            await prisma.giveaway.update({
                where: { id },
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
        const id = ValidNumber(req.params.id);
        const body = req.body as { user: string };
        if (!id) {
            res.status(400).json({ action: "Error", message: "El id debe ser un número" });
            return;
        }

        try {
            const giveaway = await prisma.giveaway.findUnique({
                where: { id },
            });

            if (!giveaway) {
                res.status(404).json({ action: "NotFound", message: "Sorteo no encontrado" });
                return
            }

            if (!giveaway.active || giveaway.end) {
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
                res.status(400).json({ action, message });
                return;
            }



            await prisma.giveaway.update({
                where: { id },
                data: { users },
            });


            if (giveaway.message) await Message.edit(
                giveaway.channel,
                giveaway.message,
                {
                    embeds: [
                        embed(
                            giveaway.prize,
                            await EmbedDescription({
                                winners: giveaway.winnersCount.toString(),
                                lang: giveaway.lang,
                                entries: users.length,
                                id: giveaway.id,
                                delay: Math.floor((giveaway.createdAt.getTime() + (giveaway.delay * 1000)) / 1000)
                            }),
                            "#1100ff"
                        )
                    ]
                }
            );

            res.status(200).json({
                action,
                message,
                users,
            });
        } catch (error) {
            console.error(error);
            if (!res.headersSent) {
                res.status(500).json({ action: "Error", message: "Error al registrar la participación" });
            }
        }
    }

    async reRoll(req: Request, res: Response) {
        const id = ValidNumber(req.params.id);

        if (!id) {
            res.status(400).json({ error: "El id debe ser un número" });
            return;
        }
        try {
            const giveaway = await prisma.giveaway.findUnique({
                where: { id }
            });

            // Si no se encuentra o no ha terminado el sorteo, respondemos y salimos
            if (!giveaway || !giveaway.end) {
                res.status(404).json({ error: "Sorteo no encontrado o no finalizado" });
                return
            }

            // Calculamos los ganadores antes de actualizar o enviar respuesta
            const winners = give.getWinners(giveaway);

            if (!winners) {

                res.status(200).json({
                    action: "NO_WINNERS_COMPLET",
                    message: "No hubo usuarios necesarios para el sorteo",
                    winners
                });
                return;
            }

            // Actualizamos la base de datos antes de las operaciones de mensajes
            await prisma.giveaway.update({
                where: { id },
                data: { winners }
            });

            // Construimos el mensaje y lo publicamos, pero no esperamos la respuesta
            const msg = await i18n(giveaway.lang, "end", {
                winners: winners.map(w => `<@${w}>`).join(", "),
                prize: giveaway.prize
            });

            // Ejecutamos de manera independiente (sin await) las funciones de mensaje
            Message.create(giveaway.channel, { content: msg }, giveaway).catch((err) =>
                console.error("Error en Message.create:", err)
            );

            if (giveaway.message) {
                Message.edit(giveaway.channel, giveaway.message, {
                    embeds: [
                        embed(
                            giveaway.prize,
                            await EmbedDescription({
                                winners: winners.map(w => `<@${w}>`).join(", "),
                                lang: giveaway.lang,
                                entries: giveaway.users.length,
                                id: giveaway.id,
                                delay: Math.floor((giveaway.createdAt.getTime() + (giveaway.delay * 1000)) / 1000)
                            }),
                            "#1100ff"
                        )
                    ]
                }).catch((err) => console.error("Error en Message.edit:", err));
            }

            // Enviamos la respuesta final
            res.status(200).json({ message: "Sorteo re-rolleado", winners });

        } catch (error) {
            console.error("Error en reRoll:", error);
            // Si ocurre un error inesperado, respondemos con el código 500
            res.status(500).json({ error: "Error al procesar la solicitud de re-rolleo" });
        }
    }






    async finish(id: number) {
        const giveaway = await prisma.giveaway.findUnique({
            where: { id },
        });

        if (giveaway && giveaway.active) {
            const winner = give.getWinners(giveaway)

            if (!winner) {
                await Message.create(giveaway.channel, {
                    content: await i18n(giveaway.lang, "noWinners"),
                }, giveaway)
                return
            }

            await prisma.giveaway.update({
                where: { id },
                data: { active: false, winners: winner, end: true },
            });

            const winners = winner.map(w => `<@${w}>`)

            const msg = await i18n(giveaway.lang, "end", {
                winners: winners.join(", "),
                prize: giveaway.prize
            });

            try {
                await Message.create(giveaway.channel, {
                    content: msg,
                }, giveaway);
                if (giveaway.message) await Message.edit(giveaway.channel, giveaway.message, {
                    embeds: [
                        embed(
                            giveaway.prize,
                            await EmbedDescription({
                                winners: winners.join(", "),
                                lang: giveaway.lang,
                                entries: giveaway.users.length,
                                id: giveaway.id,
                                delay: Math.floor((giveaway.createdAt.getTime() + (giveaway.delay * 1000)) / 1000)
                            }),
                            "#1100ff"
                        )
                    ],
                    components: []
                })
            } catch (error) {
                if (error instanceof Error) {
                    logger.errorWithType("Axios", error.stack || error.message);
                }
            }
        }
    };

    async guild(req: Request, res: Response) {
        const id = req.params.id;
        const { active, limit } = req.query;

        if (!id) {
            res.status(400).json({ error: "El id debe ser un número" });
            return;
        }
        let Bactive = ValidBoolean(active);

        let Nlimit = ValidNumber(limit);
        if (!Nlimit) Nlimit = 10;

        try {
            const giveaways = await prisma.giveaway.findMany({
                where: { guild: id, active: Bactive },
                take: Nlimit
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
    delay?: number,
    winners: string,
    entries: number,
    id: number,
}) {
    try {
        if (!data.delay) return await i18n(data.lang, "embedDescriptionNotDelay", data)
        return await i18n(data.lang, "embedDescription", data)
    } catch (e) {
        return undefined
    }
}

function ValidNumber(value?: Request["query"][0]) {
    if (typeof value != "string") return false;
    try {
        if (!value) return false;
        const n = parseInt(value);
        if (isNaN(n)) return false;
        return n
    } catch (error) {
        return false;
    }
}

function ValidBoolean(value?: Request["query"][0]) {
    if (typeof value != "string") return undefined;
    if (!value) return undefined;
    if (value.includes("true")) return true;
    if (value.includes("false")) return false;
    return undefined;
}


export default give;