import app from "./app/app";
import { web } from "./utils/assets/env";

const client = app();

client.listen(web.port, () => {
  console.log(`Servidor de sorteos corriendo en http://localhost:${web.port}`);
});
