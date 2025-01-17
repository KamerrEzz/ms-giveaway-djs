import { config } from "dotenv";
config()


export const discord = {
    token: getEnv("DISCORD_TOKEN"),
    version: getEnv("DISCORD_VERSION") || "10",
    format: getEnv("DISCORD_BUTTON_FORMAT") || "-{{i}}",
    imagen: getEnv("DISCORD_EMBED_GIVEAWAY_IMAGEN")
}

export const redis = {
    host: getEnv("REDIS_HOST", "string") || "localhost",
    password: getEnv("REDIS_PASSWORD"),
    username: getEnv("REDIS_USERNAME"),
    port: getEnv("REDIS_PORT", "number") || 6379,
    db: getEnv("REDIS_DB", "number") || 0
}

export const web = {
    token: getEnv("Token_Secret"),
    port: getEnv("PORT", "number") || 3000
}


export function discordButtonFormat(id: string) {
    return discord.format.replace(/i/g, id)
};


export function getEnv<T extends "string" | "number" | undefined = undefined>(
    key: string,
    type?: T
): (T extends undefined ? string : T extends "string" ? string : number) | undefined {

    const value = process.env[key];

    if (type === "number") {
        return value !== undefined ? parseInt(value) : undefined as any;
    }

    if (value == '') return undefined as any;

    return value as any;
}
