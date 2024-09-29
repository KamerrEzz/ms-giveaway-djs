import { Axios } from "axios";
import { discord } from "../assets/env";
import { version, name } from "../../../package.json"

export default new Axios({
    baseURL: `https://discord.com/api/v${discord.version}/`,
    headers: {
        Authorization: `Bot ${discord.token}`,
        "User-Agent": `${name} (v${version})`,
        "Content-Type": "application/json"
    }
})