# 1. On part d'une image officielle Node.js (version 20 légère)
FROM node:20-slim

# 2. On définit le dossier de travail à l'intérieur du conteneur
WORKDIR /app

# 3. On copie les fichiers de configuration (package.json)
COPY package*.json ./

# 4. On installe les dépendances
RUN npm install

# 5. On copie tout le reste du code source
COPY . .

# 6. On construit l'application Nuxt pour la production
RUN npm run build

# 7. On informe que l'app tourne sur le port 3000
EXPOSE 3000

# 8. La commande pour démarrer le serveur (comme on fait avec PM2)
CMD ["node", ".output/server/index.mjs"]