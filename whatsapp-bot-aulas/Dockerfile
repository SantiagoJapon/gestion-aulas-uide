FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# El puerto que definimos en .env del bot
EXPOSE 3020

CMD ["node", "bot.js"]
