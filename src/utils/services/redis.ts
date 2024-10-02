import Redis from "ioredis";
import { redis } from "../assets/env";
import logger from "./logger";

export default new Redis(redis.port, redis.host, {
    password: redis.password,
    username: redis.username,
    maxRetriesPerRequest: null, 
    retryStrategy(times) {
        if (times === 1) {
            logger.errorWithType("Redis", "Max reconnection attempts reached. Will not retry.");
            return null;
        }
        return Math.min(times * 50, 2000);
    },
    sentinelReconnectStrategy(retryAttempts) {
        return Math.min(retryAttempts * 50, 2000);
    }
}).on("connect", () => {
    logger.infoWithType("Redis", "Connected to Redis");
}).on("error", (e) => {
    logger.errorWithType("Redis", "Error connecting to Redis: " + e);
}).on("ready", () => {
    logger.infoWithType("Redis", "Redis is ready to use");
});
