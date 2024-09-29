import { Express } from "express";
import giveaway from "../functions/giveaway";

export default function(client: Express){
    client
    .post("/giveaway", giveaway.post)
    .get("/giveaway/:id", giveaway.get)
    .post("/giveaway/:id/end", giveaway.end)
}