import Redis from "ioredis";
import { redis } from "../assets/env";


export default new Redis(redis.port, redis.host, { password: redis.password, username: redis.username, lazyConnect: true });