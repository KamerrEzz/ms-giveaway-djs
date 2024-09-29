import { Giveaway } from "@prisma/client";
import { Queue } from "bullmq";
import { redis as connection } from "../assets/env";

export default new Queue<Giveaway>("giveawey", { connection } );