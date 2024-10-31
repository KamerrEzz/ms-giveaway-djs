import app from "./app/app";
import { web, discord } from "./utils/assets/env";
import logger from "./utils/services/logger";


if(!discord.token) {
  logger.errorWithType("Web", "No se ha proporcionado un token de Discord. Por favor, asegúrate de configurar la variable de entorno DISCORD_TOKEN.")
} else {
  const client = app();

  client.listen(web.port, () => {
    logger.infoWithType("Web",`Servidor de sorteos corriendo en http://localhost:${web.port}`);
  });
  
}


process.on("unhandledRejection", (reason, promise) => console.error(reason, "Unhandled Rejection at Promise", promise));
process.on("uncaughtException", (error, origin) => console.error(error, "Uncaught Exception thrown", origin));
