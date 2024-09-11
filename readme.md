# 🎉 Sistema de Sorteos para Bot de Discord con BullMQ, Prisma y PostgreSQL 🎉

Este proyecto es un microservicio diseñado para gestionar sorteos en un bot de Discord de manera eficiente, utilizando [BullMQ](https://docs.bullmq.io/) para la gestión de colas y [Prisma](https://www.prisma.io/) como ORM con postgresql. El sistema permite crear, gestionar y finalizar sorteos automáticamente o de forma manual a través de una API REST. Está completamente containerizado con Docker para un despliegue fácil y escalable.

## Características del Sistema 🛠️

- **BullMQ**: Maneja la cola de trabajos, programando y finalizando sorteos automáticamente.
- **Prisma ORM**: Conexión a una base de datos Postgresql para gestionar los sorteos y usuarios.
- **API REST**: Permite la integración con un bot de Discord para crear y finalizar sorteos desde comandos del bot.
- **Finalización Manual de Sorteos**: Posibilidad de finalizar sorteos manualmente antes de que el tiempo expire.
- **Redis**: Utilizado como almacenamiento de trabajos y cola para BullMQ.
- **Postgresql**: Base de datos para almacenar detalles de los sorteos y usuarios.
- **Docker**: Containerización completa para fácil despliegue.

## Integración con Discord 🤖

Este sistema se integra fácilmente con cualquier bot de Discord, permitiendo que el bot gestione los sorteos en canales de Discord a través de comandos personalizados.

## Endpoints de la API 📡

- `POST /giveaway`: Crear un nuevo sorteo.
   ```json
   {
      "channel": "123123",
      "users": ["123","123", "123", "123"],
      "prize": "nitro",
      "time": 9000, // milisegundos
      "guild": "1234567890",
      "winners": 3
   } 
   ```
- `POST /giveaway/:id/end`: Finalizar un sorteo manualmente antes de tiempo.
- `GET /giveaway/:id`: Obtener información detallada de un sorteo específico.
- `GET /guild/:id`: Obtener información de los sorteos en un servidor.
   - `?active=true`: Obtener los sorteos activos

## Tecnologías Utilizadas 🚀

- **Node.js**
- **Express**
- **BullMQ**
- **Prisma**
- **Postgresql**
- **Redis**
- **Docker & Docker Compose**

## Cómo ejecutar el proyecto 🏃‍♂️

### Requisitos

- Docker y Docker Compose instalados.

### Pasos

1. Clona este repositorio:
   ```bash
   git clone https://github.com/kamerrezz/ms-giveaway-djs.git
   cd ms-giveaway-djs
   ```

2. Ejecuta los contenedores con Docker Compose:
   ```bash
   docker-compose up --build
   ```

3. Ejecuta las migraciones de Prisma para configurar la base de datos:
   ```bash
   docker-compose exec app npm run migrate
   ```

4. Integra la API con tu bot de Discord usando las rutas expuestas en `http://localhost:3000`.

## Contribuciones ✨

¡Todas las contribuciones son bienvenidas! Abre un issue o envía un pull request con tus mejoras o nuevas características.
