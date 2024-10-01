import winston from 'winston';
import chalk from 'kleur';

// Formato personalizado que incluye 'type' y 'message', con colores en 'type' según el nivel
const customLogFormat = winston.format.printf(({ message, timestamp, type, level }) => {
    const coloredTimestamp = chalk.gray(`[${timestamp}]`); // Colorear la fecha en gris
  const coloredType = colors(level, type); // Colorear el 'type' basado en el nivel
  return `${coloredTimestamp} ${coloredType}: ${message}`;
});

// Crear el logger usando winston.createLogger()
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // Agregar timestamp
    winston.format((info) => {
      info.type = info.type || info.level; // Si no se proporciona 'type', usar 'level'
      return info;
    })(),
    customLogFormat // Aplicar el formato personalizado
  ),
  transports: [
    new winston.transports.Console(), // Registrar en la consola
  ]
});

// Función para asignar colores a 'type' según el nivel del log
function colors(level: string, type: string) {
  switch (level) {
    case 'error': return chalk.red(type);       // Rojo para errores
    case 'warn': return chalk.yellow(type);     // Amarillo para advertencias
    case 'info': return chalk.cyan(type);       // Cian para información
    case 'debug': return chalk.magenta(type);        // Magenta para debug
    default: return chalk.white(type);                            // Sin color por defecto
  }
}

// Métodos personalizados para registrar logs con 'type'
export default {
  errorWithType(type: string, message: string) {
    logger.error({ message, type });
  },

  warnWithType(type: string, message: string) {
    logger.warn({ message, type });
  },

  infoWithType(type: string, message: string) {
    logger.info({ message, type });
  },

  debugWithType(type: string, message: string) {
    logger.debug({ message, type });
  },
  ...logger
};
