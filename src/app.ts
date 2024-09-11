import express from "express";
import bodyParser from "body-parser";
import { Queue, Worker } from "bullmq";
import { prisma } from "./prismaClient";
import { config } from "dotenv";
import axios from "axios";

config()
const app = express();
const giveawayQueue = new Queue("giveaway", {
  connection: {
    host: process.env.REDIS_HOST,
    password: process.env.REDIS_PASSWORD,
    username: process.env.REDIS_USERNAME,
    port: parseInt(process.env.REDIS_PORT!),
  }
});
const port = process.env.PORT || 3000

app.use(bodyParser.json());

app.post("/giveaway", async (req, res) => {
  const { channel, users, prize, time, guild, winners } = req.body;

  if (!channel || !users || !prize || !time || !guild) {
    return res.status(400).json({ error: "Faltan datos requeridos" });
  }

  try {
    const giveaway = await prisma.giveaway.create({
      data: {
        channel,
        users,
        prize,
        endTime: new Date(Date.now() + time),
        guild,
        active: true,
        winnersCount: winners
      },
    });

    await giveawayQueue.add(
      "giveaway",
      { giveawayId: giveaway.id },
      { delay: time, removeOnComplete: true }
    );

    return res.status(201).json({ message: "Sorteo creado", giveaway });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error al crear el sorteo" });
  }
});

app.post("/giveaway/:id/end", async (req, res) => {
  const { id } = req.params;

  try {
    const giveaway = await prisma.giveaway.findUnique({
      where: { id: parseInt(id) },
    });

    if (!giveaway || !giveaway.active) {
      return res
        .status(404)
        .json({ error: "Sorteo no encontrado o ya finalizado" });
    }

    await finishGiveaway(id);

    const job = await giveawayQueue.getJob(id.toString());
    if (job) {
      await job.remove();
    }

    return res.status(200).json({ message: "Sorteo finalizado manualmente" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error al finalizar el sorteo" });
  }
});

app.get("/giveaway/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const giveaway = await prisma.giveaway.findUnique({
      where: { id: parseInt(id) },
    });

    if (!giveaway) {
      return res.status(404).json({ error: "Sorteo no encontrado" });
    }

    return res.status(200).json(giveaway);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error al obtener el sorteo" });
  }
});

app.get('/guild/:id', async (req, res) => {
  const { id } = req.params
  const { active } = req.query
  try {
    const guild = await prisma.giveaway.findMany({
      where: { guild: id, active: Boolean(active) },
    });

    if (!guild) {
      return res.status(404).json({ error: "Servidor no encontrado" });
    }

    return res.status(200).json(guild);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error al obtener el servidor" });
  }
})

const worker = new Worker("giveaway", async (job) => {
  const { giveawayId } = job.data;

  const giveaway = await prisma.giveaway.findUnique({
    where: { id: parseInt(giveawayId) },
  });

  if (giveaway && giveaway.active) {
    await finishGiveaway(giveawayId);
  }
}, {
  connection: {
    host: process.env.REDIS_HOST,
    password: process.env.REDIS_PASSWORD,
    username: process.env.REDIS_USERNAME,
    port: parseInt(process.env.REDIS_PORT!),
  }
});

worker.on('completed', (job) => {
  console.log(`Completado ${job.id}`);
})

function getWinners(giveaway: any) {
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

async function finishGiveaway(giveawayId: string) {
  const giveaway = await prisma.giveaway.findUnique({
    where: { id: parseInt(giveawayId) },
  });

  if (giveaway && giveaway.active) {
    const winner = getWinners(giveaway)


    await prisma.giveaway.update({
      where: { id: parseInt(giveawayId) },
      data: { active: false, winners: winner },
    });

    const winners = winner.map(w => `<@${w}>`)

    const msg = `El ganador del sorteo es ${winners.join()}, has ganado \`${giveaway.prize}\` !!`

    try {
      axios.post(`https://discord.com/api/channels/${giveaway.channel}/messages`, { content: msg }, {
        headers: {
          Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
          "User-Agent": "myBotThing (http://some.url, v0.1)",
          "Content-Type": "application/json"
        },
      })
    } catch (error) {
      if (error instanceof Error) {
        console.error(error.message);
      }
    }
  }
}

app.listen(port, () => {
  console.log(`Servidor de sorteos corriendo en http://localhost:${port}`);
});
