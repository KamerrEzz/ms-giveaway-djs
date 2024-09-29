import bodyParser from "body-parser";
import express from "express";
import giveaway from "./routers/giveaway";
import "../utils/services/worker";

export default function () {
    let client = express()
        .use(bodyParser.json());



   giveaway(client)

    client.all("*", (req, res) => {
        res.status(404);
        res.send(JSON.stringify({ error: "Not Found" }));
        console.log("404 - " + req.url)
    })
    return client;
}