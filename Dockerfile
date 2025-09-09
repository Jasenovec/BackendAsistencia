
FROM node:20-alpine

# Crea usuario no-root
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Copia el código
COPY . .

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Ajusta si tu entrypoint es otro archivo
CMD ["node", "index.js"]
