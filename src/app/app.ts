import bodyParser from "body-parser";
import express from "express";
import giveaway from "./routers/giveaway";
import "../utils/services/worker";
import security from "./functions/security";
import boom from "@hapi/boom";

export default function () {
    let client = express()
        .use(bodyParser.json())
        .use(security);

    giveaway(client)
    
    client.all("/", (req, res) => {
        res.status(200).json({ message: "Welcome to the API" })
    });

    client.all("*", (req, res) => {
        res.status(404).json(boom.notFound("Not found"))
    })



    return client;
}