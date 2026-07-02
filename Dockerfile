FROM node:20-alpine

# Establece el directorio de trabajo
WORKDIR /app

# Copia los archivos de dependencias primero (aprovecha el caché de Docker)
COPY package*.json ./

# Instala solo las dependencias de producción
RUN npm ci --omit=dev

# Copia el resto del código de la aplicación
COPY . .

# Aquí aplicamos lo del usuario no-root que mencionabas en tu comentario
RUN chown -R node:node /app
USER node

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000

# Expone el puerto
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["node", "index.js"]