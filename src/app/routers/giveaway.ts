import { Express } from "express";
import giveaway from "../functions/giveaway";
import joiValidated from "../functions/joiValidated";
import { GiveawayJoinValid, GiveawayPost, GiveawayPut } from "../schema/giveaway";

export default function(client: Express){
    client
    .post("/giveaway", joiValidated("body", GiveawayPost), giveaway.post)
    .get("/giveaway/:id", giveaway.get)
    .put("/giveaway/:id", joiValidated("body", GiveawayPut), giveaway.put)
    .post("/giveaway/:id/pause", giveaway.pause)
    .post("/giveaway/:id/reopen", giveaway.reOpen)
    .post("/giveaway/:id/end", giveaway.end)
    .post("/giveaway/:id/valid", joiValidated("body", GiveawayJoinValid), giveaway.Valid)
    .post("/giveaway/:id/reroll",  giveaway.reRoll)
}